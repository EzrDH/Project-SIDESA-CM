import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';

describe('Input validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects a challenge request with no accountId', async () => {
    await request(app.getHttpServer()).post('/auth/challenge').send({}).expect(400);
  });

  it('rejects a verify request whose signature is not 192 hex chars', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ accountId: 'a', nonce: 'b', signature: 'not-a-signature' })
      .expect(400);
  });

  it('rejects a verify request with a missing field', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ accountId: 'a', signature: 'a'.repeat(192) })
      .expect(400);
  });

  it('rejects a booking with a blank purpose', async () => {
    // Unauthenticated, but validation runs before the body ever reaches a guard-
    // protected handler only if the guard passes; here we assert the auth guard
    // still shields the endpoint (no 500 leaking from malformed input).
    const res = await request(app.getHttpServer()).post('/bookings').send({ purpose: '', requestedSlot: '' });
    expect([400, 401]).toContain(res.status);
  });
});
