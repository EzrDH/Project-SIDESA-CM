import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('auth + rbac flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const kp = generateKeyPair();
  const pkHex = hex(kp.publicKey);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
  });
  afterAll(async () => {
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: pkHex } } });
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
    await app.close();
  });

  it('registers, is activated, logs in with a signed challenge, and reads /me', async () => {
    const reg = await request(app.getHttpServer())
      .post('/accounts/register')
      .send({ publicKey: pkHex, displayName: 'Budi', nikCommitment: 'commit-abc' });
    expect(reg.status).toBe(201);
    const accountId = reg.body.id;

    // Simulate operator approval (Plan #3 does this via UI): flip to ACTIVE
    await prisma.account.update({ where: { id: accountId }, data: { status: 'ACTIVE' } });

    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
    const nonce = ch.body.nonce as string;
    const signature = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, nonce)));

    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId, nonce, signature });
    expect(vr.status).toBe(201);
    expect(vr.body.role).toBe('WARGA');

    const me = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${vr.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ accountId, role: 'WARGA' });
  });

  it('forbids a WARGA from the ADMIN-only provisioning route', async () => {
    const account = await prisma.account.findFirst({ where: { publicKey: pkHex } });
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId: account!.id });
    const signature = hex(signMessage(kp.privateKey, buildAuthMessage(account!.id, ch.body.nonce)));
    const vr = await request(app.getHttpServer()).post('/auth/verify').send({ accountId: account!.id, nonce: ch.body.nonce, signature });

    const res = await request(app.getHttpServer())
      .post('/accounts/privileged')
      .set('Authorization', `Bearer ${vr.body.token}`)
      .send({ role: 'OPERATOR', publicKey: 'pk-someone', displayName: 'X' });
    expect(res.status).toBe(403);
  });
});
