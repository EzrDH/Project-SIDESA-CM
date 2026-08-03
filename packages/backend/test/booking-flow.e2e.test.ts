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

describe('Booking flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair(), kades = generateKeyPair(), warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  let opId = '', kaId = '', waId = '';
  const slot = '2026-09-01T09:00:00.000Z';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'KaDes' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi' } })).id;
  });
  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.eligibilityChallenge.deleteMany({ where: { accountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.registryVersion.deleteMany({ where: { signedBy: kaPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('warga books -> KaDes confirms -> operator checks in; warga cannot confirm', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);

    // Booking is gated by an eligibility proof, so the warga has to be an
    // approved member of a published registry before they can book at all.
    await request(app.getHttpServer()).post('/registry/approve')
      .set('Authorization', `Bearer ${opToken}`)
      .send({ wargaAccountId: waId, attributes: 'rt=001;domisili=CibeteungMuara' }).expect(201);
    const snap = await request(app.getHttpServer()).post('/registry/snapshot')
      .set('Authorization', `Bearer ${opToken}`).expect(201);
    await request(app.getHttpServer()).post('/registry/publish')
      .set('Authorization', `Bearer ${kaToken}`)
      .send({ version: snap.body.version, signature: hex(signMessage(kades.privateKey, hexToBytes(snap.body.root))) })
      .expect(201);

    const waToken = await login(app, warga, waId);
    const mp = await request(app.getHttpServer()).get('/registry/proof')
      .set('Authorization', `Bearer ${waToken}`).expect(200);
    const nonce = (await request(app.getHttpServer()).post('/bookings/eligibility-challenge')
      .set('Authorization', `Bearer ${waToken}`).expect(201)).body.nonce as string;
    const eligibility = {
      proof: {
        publicKey: waPk,
        attributes: mp.body.attributes,
        merkleProof: mp.body.merkleProof,
        ownership: schnorrProofHex(
          warga.privateKey,
          new TextEncoder().encode(buildBookingEligibilityContext(waId, nonce)),
        ),
      },
      nonce,
    };

    const created = await request(app.getHttpServer()).post('/bookings')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ purpose: 'Konsultasi bantuan sosial', requestedSlot: slot, eligibility }).expect(201);
    const { id, checkinToken } = created.body;

    await request(app.getHttpServer()).post(`/bookings/${id}/confirm`).set('Authorization', `Bearer ${waToken}`).send({}).expect(403);

    await request(app.getHttpServer()).post(`/bookings/${id}/confirm`).set('Authorization', `Bearer ${kaToken}`).send({}).expect(201);

    const ci = await request(app.getHttpServer()).post('/bookings/checkin')
      .set('Authorization', `Bearer ${opToken}`).send({ token: checkinToken }).expect(201);
    expect(ci.body.status).toBe('CHECKED_IN');
  });
});
