import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, getPublicKey, signMessage, proveKnowledge } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { hexToBytes } from '../src/registry/registry.builder';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();

async function login(app: INestApplication, kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
  const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
  const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
  const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce: ch.body.nonce, signature: sig });
  return vr.body.token;
}

describe('ZKP eligibility flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair();
  const kades = generateKeyPair();
  const warga = generateKeyPair();
  const opPk = hex(operator.publicKey), kaPk = hex(kades.publicKey), waPk = hex(warga.publicKey);
  const wargaScalar = BigInt('0x' + hex(warga.privateKey));
  let opId = '', kaId = '', waId = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    opId = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator' } })).id;
    kaId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kaPk, displayName: 'KaDes' } })).id;
    waId = (await prisma.account.create({ data: { role: 'WARGA', status: 'PENDING', publicKey: waPk, displayName: 'Budi', nikCommitment: 'c' } })).id;
  });
  afterAll(async () => {
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: { in: [opPk, kaPk, waPk] } } } });
    await prisma.registryVersion.deleteMany({ where: { signedBy: kaPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [opPk, kaPk, waPk] } } });
    await app.close();
  });

  it('approve -> sign root -> warga proves eligibility -> server verifies', async () => {
    const opToken = await login(app, operator, opId);
    const kaToken = await login(app, kades, kaId);

    // Warga is PENDING and cannot authenticate until the operator approves it.
    await request(app.getHttpServer()).post('/registry/approve')
      .set('Authorization', `Bearer ${opToken}`)
      .send({ wargaAccountId: waId, attributes: 'rt=001;domisili=CibeteungMuara' }).expect(201);

    const waToken = await login(app, warga, waId);

    const snap = await request(app.getHttpServer()).post('/registry/snapshot')
      .set('Authorization', `Bearer ${opToken}`).expect(201);

    const rootSig = hex(signMessage(kades.privateKey, hexToBytes(snap.body.root)));
    await request(app.getHttpServer()).post('/registry/publish')
      .set('Authorization', `Bearer ${kaToken}`)
      .send({ version: snap.body.version, signature: rootSig }).expect(201);

    const p = await request(app.getHttpServer()).get('/registry/proof')
      .set('Authorization', `Bearer ${waToken}`).expect(200);

    const context = 'permohonan:SKTM:seq=1';
    const ownership = proveKnowledge(wargaScalar, getPublicKey(warga.privateKey), enc.encode(context));
    const proof = {
      publicKey: waPk,
      attributes: p.body.attributes,
      merkleProof: p.body.merkleProof,
      ownership: { R: hex(ownership.R), s: hex(ownership.s) },
    };

    const res = await request(app.getHttpServer()).post('/eligibility/verify').send({ proof, context }).expect(201);
    expect(res.body.valid).toBe(true);

    const replay = await request(app.getHttpServer()).post('/eligibility/verify').send({ proof, context: 'different' }).expect(201);
    expect(replay.body.valid).toBe(false);
  });
});
