import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('Notifications token endpoints (e2e, needs Postgres)', () => {
  let app: INestApplication; let prisma: PrismaService;
  const kp = generateKeyPair(); const pk = hex(kp.publicKey); let accId = '';
  const kp2 = generateKeyPair(); const pk2 = hex(kp2.publicKey); let accId2 = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: pk } });
    accId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: pk, displayName: 'W' } })).id;
    await prisma.account.deleteMany({ where: { publicKey: pk2 } });
    accId2 = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: pk2, displayName: 'W2' } })).id;
  });
  afterAll(async () => {
    await prisma.deviceToken.deleteMany({ where: { accountId: accId } });
    await prisma.authChallenge.deleteMany({ where: { accountId: accId } });
    await prisma.account.deleteMany({ where: { id: accId } });
    await prisma.deviceToken.deleteMany({ where: { accountId: accId2 } });
    await prisma.authChallenge.deleteMany({ where: { accountId: accId2 } });
    await prisma.account.deleteMany({ where: { id: accId2 } });
    await app.close();
  });

  async function login(): Promise<string> {
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId: accId });
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accId, ch.body.nonce)));
    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId: accId, nonce: ch.body.nonce, signature: sig });
    return vr.body.token;
  }

  async function login2(): Promise<string> {
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId: accId2 });
    const sig = hex(signMessage(kp2.privateKey, buildAuthMessage(accId2, ch.body.nonce)));
    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId: accId2, nonce: ch.body.nonce, signature: sig });
    return vr.body.token;
  }

  it('registers and unregisters the caller token; rejects an anonymous call', async () => {
    const token = await login();
    await request(app.getHttpServer()).post('/notifications/token').send({ token: 'fcm-tok-1', platform: 'android' }).expect(401);

    await request(app.getHttpServer())
      .post('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ token: 'fcm-tok-1', platform: 'android' }).expect(201);
    expect(await prisma.deviceToken.count({ where: { accountId: accId } })).toBe(1);

    // A different authenticated account cannot delete another account's token.
    const token2 = await login2();
    await request(app.getHttpServer())
      .delete('/notifications/token').set('authorization', `Bearer ${token2}`)
      .send({ token: 'fcm-tok-1' }).expect(200);
    expect(await prisma.deviceToken.count({ where: { accountId: accId } })).toBe(1);

    await request(app.getHttpServer())
      .delete('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ token: 'fcm-tok-1' }).expect(200);
    expect(await prisma.deviceToken.count({ where: { accountId: accId } })).toBe(0);
  });

  it('rejects a malformed body', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/notifications/token').set('authorization', `Bearer ${token}`)
      .send({ platform: 'android' }).expect(400); // token missing
  });
});
