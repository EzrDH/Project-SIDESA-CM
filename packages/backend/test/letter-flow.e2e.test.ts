import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
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

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'H. Asep Saepudin' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi' } })).id;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: waId } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('warga requests -> operator drafts -> KaDes signs -> public verify succeeds', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);
    const waToken = await login(app, warga, waId);

    const req = await request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`)
      .send({ type: 'DOMISILI', formData: { nama: 'Budi Santoso', alamat: 'Kp. Muara RT 01' } }).expect(201);
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
  });

  it('forbids a warga from drafting (operator-only)', async () => {
    const waToken = await login(app, warga, waId);
    const req = await request(app.getHttpServer()).post('/letters/request')
      .set('Authorization', `Bearer ${waToken}`).send({ type: 'SKTM', formData: { nama: 'Budi' } }).expect(201);
    await request(app.getHttpServer()).post(`/letters/${req.body.id}/draft`).set('Authorization', `Bearer ${waToken}`).expect(403);
  });
});
