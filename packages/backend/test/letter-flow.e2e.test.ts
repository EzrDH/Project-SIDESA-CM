import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { buildEligibilityContext } from '../src/registry/eligibility.context';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, signature: sig });
  return vr.body.token;
}

describe('Letter flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair(), kades = generateKeyPair(), warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  let opId = '', kaId = '', waId = '';

  // A warga now needs a fresh ZKP eligibility proof (bound to a single-use nonce)
  // to submit any letter request. This mirrors what the mobile app does.
  async function requestWithProof(waToken: string, type: string, formData: Record<string, string>) {
    const ch = await request(app.getHttpServer()).post('/letters/eligibility-challenge').set('Authorization', `Bearer ${waToken}`).expect(201);
    const p = await request(app.getHttpServer()).get('/registry/proof').set('Authorization', `Bearer ${waToken}`).expect(200);
    const context = buildEligibilityContext(waId, type, ch.body.nonce);
    const ownership = hex(signMessage(warga.privateKey, enc.encode(context)));
    const proof = {
      publicKey: waPk,
      attributes: p.body.attributes,
      merkleProof: p.body.merkleProof,
      ownership,
    };
    return request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ type, formData, eligibility: { proof, nonce: ch.body.nonce } });
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'H. Asep Saepudin' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi' } })).id;

    // Register the warga and publish a KaDes-signed registry root so proofs verify.
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    await request(app.getHttpServer()).post('/registry/approve').set('Authorization', `Bearer ${opToken}`)
      .send({ wargaAccountId: waId, attributes: 'rt=001;domisili=CibeteungMuara' }).expect(201);
    const snap = await request(app.getHttpServer()).post('/registry/snapshot').set('Authorization', `Bearer ${opToken}`).expect(201);
    const rootSig = hex(signMessage(kades.privateKey, Uint8Array.from(Buffer.from(snap.body.root, 'hex'))));
    await request(app.getHttpServer()).post('/registry/publish').set('Authorization', `Bearer ${kaToken}`)
      .send({ version: snap.body.version, signature: rootSig }).expect(201);
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: waId } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.eligibilityChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.registryVersion.deleteMany({ where: { signedBy: kaPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('warga proves eligibility -> requests -> operator drafts -> KaDes signs -> public verify succeeds', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    const waToken = await login(app, warga, waId);

    const req = await requestWithProof(waToken, 'DOMISILI', { nama: 'Budi Santoso', alamat: 'Kp. Muara RT 01' });
    expect(req.status).toBe(201);
    const id = req.body.id;

    await request(app.getHttpServer()).post(`/letters/${id}/draft`).set('Authorization', `Bearer ${opToken}`).expect(201);

    // KaDes sees the drafted letter in the signing queue, with its assigned number.
    const sq = await request(app.getHttpServer()).get('/letters/signing-queue').set('Authorization', `Bearer ${kaToken}`).expect(200);
    const queued = (sq.body as any[]).find((r) => r.id === id);
    expect(queued).toBeTruthy();
    expect(queued.letterNumber).toBeTruthy();

    const fs = await request(app.getHttpServer()).get(`/letters/${id}/for-signing`).set('Authorization', `Bearer ${kaToken}`).expect(200);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.body.canonicalContent)));
    const signed = await request(app.getHttpServer()).post(`/letters/${id}/sign`).set('Authorization', `Bearer ${kaToken}`).send({ signature: sig }).expect(201);

    // Once signed, it leaves the signing queue.
    const sq2 = await request(app.getHttpServer()).get('/letters/signing-queue').set('Authorization', `Bearer ${kaToken}`).expect(200);
    expect((sq2.body as any[]).find((r) => r.id === id)).toBeFalsy();

    const v = await request(app.getHttpServer()).get(`/verify/${signed.body.qrToken}`).expect(200);
    expect(v.body.valid).toBe(true);
    expect(v.body.signer).toBe('H. Asep Saepudin');
    expect(v.body.letterNumber).toBe(signed.body.letterNumber);

    // Sensitive actions land in the tamper-evident audit chain.
    const audit = await request(app.getHttpServer()).get('/audit/verify').set('Authorization', `Bearer ${kaToken}`).expect(200);
    expect(audit.body.valid).toBe(true);
    expect(audit.body.count).toBeGreaterThan(0);
    const list = await request(app.getHttpServer()).get('/audit').set('Authorization', `Bearer ${kaToken}`).expect(200);
    expect((list.body as any[]).some((e) => e.action === 'LETTER_SIGN' && e.target === id)).toBe(true);
    // A warga cannot read the audit trail.
    await request(app.getHttpServer()).get('/audit/verify').set('Authorization', `Bearer ${waToken}`).expect(403);
  });

  it('rejects a letter request with no eligibility proof', async () => {
    const waToken = await login(app, warga, waId);
    await request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ type: 'SKTM', formData: { nama: 'Budi' } }).expect(403);
  });

  it('rejects a replayed eligibility nonce', async () => {
    const waToken = await login(app, warga, waId);
    const ch = await request(app.getHttpServer()).post('/letters/eligibility-challenge').set('Authorization', `Bearer ${waToken}`).expect(201);
    const p = await request(app.getHttpServer()).get('/registry/proof').set('Authorization', `Bearer ${waToken}`).expect(200);
    const context = buildEligibilityContext(waId, 'DOMISILI', ch.body.nonce);
    const ownership = hex(signMessage(warga.privateKey, enc.encode(context)));
    const proof = { publicKey: waPk, attributes: p.body.attributes, merkleProof: p.body.merkleProof, ownership };
    const body = { type: 'DOMISILI', formData: { nama: 'Budi' }, eligibility: { proof, nonce: ch.body.nonce } };

    await request(app.getHttpServer()).post('/letters/request').set('Authorization', `Bearer ${waToken}`).send(body).expect(201);
    // Same nonce again -> burned -> rejected.
    await request(app.getHttpServer()).post('/letters/request').set('Authorization', `Bearer ${waToken}`).send(body).expect(403);
  });

  it('forbids a warga from drafting (operator-only)', async () => {
    const opToken = await login(app, operator, opId);
    const waToken = await login(app, warga, waId);
    const req = await requestWithProof(waToken, 'SKTM', { nama: 'Budi' });
    expect(req.status).toBe(201);
    await request(app.getHttpServer()).post(`/letters/${req.body.id}/draft`).set('Authorization', `Bearer ${waToken}`).expect(403);
    // sanity: operator still can
    await request(app.getHttpServer()).post(`/letters/${req.body.id}/draft`).set('Authorization', `Bearer ${opToken}`).expect(201);
  });
});
