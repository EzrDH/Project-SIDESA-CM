import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateKeyPair, derivePublic, secretFromBytes, proveKnowledge, encodeProof,
} from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
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

/// A malformed eligibility proof is a rejection, not a crash.
///
/// Gates 1 and 2 answer garbage with a clean 401/400 because their proof field
/// is validated at the DTO boundary. Gate 3 carried its proof inside a bare
/// object, so a missing or wrongly-typed field reached the crypto layer and
/// dereferenced undefined — surfacing as a 500 with a stack trace, on an
/// endpoint that needs no credentials. All three gates must reject uniformly.
describe('malformed eligibility proofs are rejected, never crash (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const warga = generateKeyPair();
  const waPk = hex(warga.publicKey);
  let waId = '';
  let waToken = '';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: waPk } });
    waId = (await prisma.account.create({
      data: { role: 'WARGA', status: 'ACTIVE', publicKey: waPk, displayName: 'Budi', nikCommitment: 'c' },
    })).id;
    waToken = await login(app, warga, waId);
  });
  afterAll(async () => {
    await prisma.eligibilityChallenge.deleteMany({ where: { accountId: waId } });
    await prisma.authChallenge.deleteMany({ where: { account: { publicKey: waPk } } });
    await prisma.account.deleteMany({ where: { publicKey: waPk } });
    await app.close();
  });

  const wellFormed = () => ({
    publicKey: waPk,
    attributes: 'rt=001',
    merkleProof: [],
    ownership: 'aa'.repeat(97),
  });

  describe('POST /eligibility/verify (unauthenticated)', () => {
    // No credentials are needed to reach this endpoint, so a crash here is
    // reachable by anyone who can send a request.
    const bad: [string, unknown][] = [
      ['empty proof object', {}],
      ['proof is null', null],
      ['proof is a string', 'not-an-object'],
      ['merkleProof is not an array', { ...wellFormed(), merkleProof: 'nope' }],
      ['merkleProof entry missing sibling', { ...wellFormed(), merkleProof: [{ isRight: true }] }],
      ['merkleProof sibling is not hex', { ...wellFormed(), merkleProof: [{ sibling: 'zz', isRight: true }] }],
      ['ownership missing', { publicKey: waPk, attributes: 'rt=001', merkleProof: [] }],
      ['ownership is wrong length', { ...wellFormed(), ownership: 'aa' }],
      ['publicKey is not a compressed point', { ...wellFormed(), publicKey: 'ff'.repeat(49) }],
      ['attributes is a number', { ...wellFormed(), attributes: 42 }],
    ];

    for (const [label, proof] of bad) {
      it(`rejects with 400 instead of 500: ${label}`, async () => {
        const res = await request(app.getHttpServer())
          .post('/eligibility/verify')
          .send({ proof, context: 'permohonan:SKTM:seq=1' });
        expect(res.status).toBe(400);
        // A 500 leaks the internal stack; a 400 says only that the input was bad.
        expect(JSON.stringify(res.body)).not.toMatch(/Cannot read|is not a function|TypeError/);
      });
    }

    it('rejects a missing context', async () => {
      const res = await request(app.getHttpServer())
        .post('/eligibility/verify')
        .send({ proof: wellFormed() });
      expect(res.status).toBe(400);
    });

    it('still answers {valid:false} for a well-formed but wrong proof', async () => {
      const res = await request(app.getHttpServer())
        .post('/eligibility/verify')
        .send({ proof: wellFormed(), context: 'permohonan:SKTM:seq=1' });
      expect(res.status).toBe(201);
      expect(res.body.valid).toBe(false);
    });
  });

  describe('POST /letters/request (authenticated)', () => {
    it('rejects a structurally malformed proof without a 500, and does not burn the nonce', async () => {
      const ch = await request(app.getHttpServer())
        .post('/letters/eligibility-challenge')
        .set('Authorization', `Bearer ${waToken}`).expect(201);
      const nonce = ch.body.nonce as string;

      const res = await request(app.getHttpServer())
        .post('/letters/request')
        .set('Authorization', `Bearer ${waToken}`)
        .send({ type: 'SKTM', formData: { tujuan: 'x' }, eligibility: { proof: {}, nonce } });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toMatch(/Cannot read|is not a function|TypeError/);

      // Garbage that never reached the verifier must not consume the challenge.
      const row = await prisma.eligibilityChallenge.findUnique({ where: { nonce } });
      expect(row?.used).toBe(false);
    });

    it('rejects a non-array merkleProof without a 500', async () => {
      const ch = await request(app.getHttpServer())
        .post('/letters/eligibility-challenge')
        .set('Authorization', `Bearer ${waToken}`).expect(201);

      const res = await request(app.getHttpServer())
        .post('/letters/request')
        .set('Authorization', `Bearer ${waToken}`)
        .send({
          type: 'SKTM',
          formData: { tujuan: 'x' },
          eligibility: { proof: { ...wellFormed(), merkleProof: 'not-an-array' }, nonce: ch.body.nonce },
        });

      expect(res.status).toBe(400);
    });

    it('rejects a missing nonce without a 500', async () => {
      const res = await request(app.getHttpServer())
        .post('/letters/request')
        .set('Authorization', `Bearer ${waToken}`)
        .send({ type: 'SKTM', formData: { tujuan: 'x' }, eligibility: { proof: wellFormed() } });

      expect(res.status).toBe(400);
    });

    it('still answers 403 for a well-formed proof that does not verify', async () => {
      const ch = await request(app.getHttpServer())
        .post('/letters/eligibility-challenge')
        .set('Authorization', `Bearer ${waToken}`).expect(201);

      const res = await request(app.getHttpServer())
        .post('/letters/request')
        .set('Authorization', `Bearer ${waToken}`)
        .send({
          type: 'SKTM',
          formData: { tujuan: 'x' },
          eligibility: { proof: wellFormed(), nonce: ch.body.nonce },
        });

      expect(res.status).toBe(403);
    });
  });
});
