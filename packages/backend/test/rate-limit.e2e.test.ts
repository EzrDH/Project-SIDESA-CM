import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

// Gap 1 (traceability matrix): app.module.ts registers a global 120/min throttler,
// and auth.controller.ts narrows /auth/* to 15/min via @Throttle. Both are inert
// under vitest (`skipIf: () => !!process.env.VITEST`) so the rest of the suite
// isn't rate limited. skipIf is evaluated on every request (not once at module
// construction), so deleting process.env.VITEST for the duration of a single
// test activates the real throttler; restoring it afterwards returns the suite
// to normal. See packages/backend/src/app.module.ts and auth/auth.controller.ts.
describe('rate limiting on /auth/challenge (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const kp = generateKeyPair();
  const pkHex = hex(kp.publicKey);
  let accountId = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
    const reg = await request(app.getHttpServer())
      .post('/accounts/register')
      .send({ publicKey: pkHex, displayName: 'Rate Limit Tester', nikCommitment: 'commit-rate-limit' });
    accountId = reg.body.id;
  });
  afterAll(async () => {
    await prisma.authChallenge.deleteMany({ where: { accountId } });
    await prisma.account.deleteMany({ where: { publicKey: pkHex } });
    await app.close();
  });

  it('rejects the 16th request in a minute with 429, once the throttler is active', async () => {
    const original = process.env.VITEST;
    delete process.env.VITEST;
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 16; i++) {
        const res = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 15).every((s) => s !== 429)).toBe(true);
      expect(statuses[15]).toBe(429);
    } finally {
      if (original === undefined) delete process.env.VITEST;
      else process.env.VITEST = original;
    }
  });

  it('stays inert (no 429s) while VITEST is set, pinning the "skip under test" behaviour', async () => {
    expect(process.env.VITEST).toBeTruthy();
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
      statuses.push(res.status);
    }
    expect(statuses.every((s) => s !== 429)).toBe(true);
  });
});
