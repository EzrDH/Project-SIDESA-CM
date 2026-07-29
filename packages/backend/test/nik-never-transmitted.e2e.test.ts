import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateKeyPair, signMessage, hashUtf8, derivePublic, secretFromBytes, proveKnowledge, encodeProof,
} from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { buildEnrollMessage } from '../src/enroll/enroll.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function schnorrProofHex(privateKey: Uint8Array, context: Uint8Array): string {
  const x = secretFromBytes(privateKey);
  return hex(encodeProof(proveKnowledge(x, derivePublic(x), context)));
}

// Gap 2 (traceability matrix): the design claims the NIK is verified physically,
// once, at enrolment, and is never digitised -- the server stores only a
// nikCommitment (hash), and no request body carries the raw NIK. Nothing tested
// this. This test picks a distinctive raw NIK, derives a commitment from it the
// same way an operator device would, and asserts the raw value never appears in
// any request body sent, nor in the persisted Account row.
const RAW_NIK = '3201234567890001';

describe('raw NIK never reaches the server (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair();
  const opPk = hex(operator.publicKey);
  let opId = '';
  const created: string[] = [];
  const sentBodies: unknown[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: opPk } });
    opId = (await prisma.account.create({
      data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator NIK Test' },
    })).id;
  });
  afterAll(async () => {
    await prisma.enrollmentCode.deleteMany({ where: { issuedBy: opId } });
    await prisma.authChallenge.deleteMany({ where: { accountId: { in: [opId, ...created] } } });
    await prisma.account.deleteMany({ where: { id: { in: [opId, ...created] } } });
    await app.close();
  });

  // Wraps supertest so every outgoing body is captured for the "never transmitted" assertion.
  async function post(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
    sentBodies.push(body);
    let req = request(app.getHttpServer()).post(path);
    for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
    return req.send(body);
  }

  async function login(kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
    const ch = await post('/auth/challenge', { accountId });
    const proof = schnorrProofHex(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce));
    const vr = await post('/auth/verify', { accountId, nonce: ch.body.nonce, proof });
    return vr.body.token;
  }

  it('never sends the raw NIK on the wire, and the stored Account only has its commitment', async () => {
    const nikCommitment = hex(hashUtf8(RAW_NIK));
    expect(nikCommitment).not.toContain(RAW_NIK);

    const opToken = await login(operator, opId);
    const issue = await post(
      '/enroll/code',
      { displayName: 'Warga NIK Test', nikCommitment, attributes: 'rt=001;domisili=CibeteungMuara' },
      { Authorization: `Bearer ${opToken}` },
    );
    expect(issue.status).toBe(201);
    const code = issue.body.code as string;

    const device = generateKeyPair();
    const devPk = hex(device.publicKey);
    const pop = hex(signMessage(device.privateKey, buildEnrollMessage(code, devPk)));
    const claim = await post('/enroll/claim', { code, publicKey: devPk, signature: pop });
    expect(claim.status).toBe(201);
    const accountId = claim.body.accountId as string;
    created.push(accountId);

    const token = await login(device, accountId);
    expect(token).toBeTruthy();

    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc).not.toBeNull();
    expect(acc!.nikCommitment).not.toBe(RAW_NIK);
    expect(acc!.nikCommitment).toBe(nikCommitment);
    expect(JSON.stringify(acc)).not.toContain(RAW_NIK);

    for (const body of sentBodies) {
      expect(JSON.stringify(body)).not.toContain(RAW_NIK);
    }
    expect(sentBodies.length).toBeGreaterThan(0);
  });
});
