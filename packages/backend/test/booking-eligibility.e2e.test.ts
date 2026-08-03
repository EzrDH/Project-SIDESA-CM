import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateKeyPair, derivePublic, secretFromBytes, proveKnowledge, encodeProof, signMessage,
} from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { buildBookingEligibilityContext } from '../src/registry/eligibility.context';
import { hexToBytes } from '../src/registry/registry.builder';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

function schnorrProofHex(privateKey: Uint8Array, context: Uint8Array): string {
  const x = secretFromBytes(privateKey);
  return hex(encodeProof(proveKnowledge(x, derivePublic(x), context)));
}

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const proof = schnorrProofHex(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, proof });
  return vr.body.token;
}

/// Booking is the service the product exists for, so it — not the letter flow —
/// is what the eligibility gate has to protect. Without this, deleting the
/// letter subsystem would take the whole ZKP feature with it.
describe('Booking is gated by an eligibility proof (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair(), kades = generateKeyPair(), warga = generateKeyPair();
  const stranger = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  let opId = '', kaId = '', waId = '';
  let waToken = '';
  let membership: { attributes: string; merkleProof: unknown };

  const slot = '2026-10-01T09:00:00.000Z';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'KaDes' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'PENDING', publicKey: waPk, displayName: 'Budi' } })).id;

    // Publish a registry the warga is a member of, so eligibility can succeed.
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    await request(app.getHttpServer()).post('/registry/approve')
      .set('Authorization', `Bearer ${opToken}`)
      .send({ wargaAccountId: waId, attributes: 'rt=001;domisili=CibeteungMuara' }).expect(201);
    const snap = await request(app.getHttpServer()).post('/registry/snapshot')
      .set('Authorization', `Bearer ${opToken}`).expect(201);
    const rootSig = hex(signMessage(kades.privateKey, hexToBytes(snap.body.root)));
    await request(app.getHttpServer()).post('/registry/publish')
      .set('Authorization', `Bearer ${kaToken}`)
      .send({ version: snap.body.version, signature: rootSig }).expect(201);

    waToken = await login(app, warga, waId);
    const p = await request(app.getHttpServer()).get('/registry/proof')
      .set('Authorization', `Bearer ${waToken}`).expect(200);
    membership = { attributes: p.body.attributes, merkleProof: p.body.merkleProof };
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.eligibilityChallenge.deleteMany({ where: { accountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.registryVersion.deleteMany({ where: { signedBy: kaPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  async function challenge(): Promise<string> {
    const r = await request(app.getHttpServer()).post('/bookings/eligibility-challenge')
      .set('Authorization', `Bearer ${waToken}`).expect(201);
    return r.body.nonce as string;
  }

  function eligibilityFor(nonce: string, key = warga, asAccount = waId) {
    const ctx = enc.encode(buildBookingEligibilityContext(asAccount, nonce));
    return {
      proof: { publicKey: hex(key.publicKey), ...membership, ownership: schnorrProofHex(key.privateKey, ctx) },
      nonce,
    };
  }

  const body = (eligibility: unknown) => ({ purpose: 'Konsultasi bantuan sosial', requestedSlot: slot, eligibility });

  it('accepts a booking backed by a valid eligibility proof, and burns the nonce', async () => {
    const nonce = await challenge();
    const res = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send(body(eligibilityFor(nonce))).expect(201);

    expect(res.body.id).toBeTruthy();
    const row = await prisma.eligibilityChallenge.findUnique({ where: { nonce } });
    expect(row?.used).toBe(true);
  });

  it('rejects a booking with no eligibility at all', async () => {
    const res = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ purpose: 'Konsultasi', requestedSlot: slot });
    expect(res.status).toBe(400);
  });

  it('rejects a replayed proof: the nonce is single-use', async () => {
    const nonce = await challenge();
    const el = eligibilityFor(nonce);
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`).send(body(el)).expect(201);
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`).send(body(el)).expect(403);
  });

  it('rejects a proof built for a different nonce', async () => {
    const a = await challenge();
    const b = await challenge();
    // proof bound to nonce a, submitted with nonce b
    const el = { proof: eligibilityFor(a).proof, nonce: b };
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`).send(body(el)).expect(403);
  });

  it('rejects a proof from a key that is not the authenticated account', async () => {
    const nonce = await challenge();
    const el = eligibilityFor(nonce, stranger);
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`).send(body(el)).expect(403);
  });

  it('rejects a structurally malformed proof without a 500', async () => {
    const nonce = await challenge();
    const res = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send(body({ proof: {}, nonce }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/Cannot read|is not a function|TypeError/);
  });

  it('rejects a proof bound to the letter context instead of the booking context', async () => {
    // Domain separation: the two flows must not accept each other's proofs.
    const nonce = await challenge();
    const letterCtx = enc.encode(`SIDESA-letter-eligibility-v1|${waId}|SKTM|${nonce}`);
    const el = {
      proof: { publicKey: waPk, ...membership, ownership: schnorrProofHex(warga.privateKey, letterCtx) },
      nonce,
    };
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`).send(body(el)).expect(403);
  });

  it('does not burn the nonce when the proof fails to verify', async () => {
    const nonce = await challenge();
    await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send(body(eligibilityFor(nonce, stranger))).expect(403);
    const row = await prisma.eligibilityChallenge.findUnique({ where: { nonce } });
    expect(row?.used).toBe(false);
  });
});
