import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { buildAuthMessage } from '../src/auth/auth.message';
import { buildEnrollMessage } from '../src/enroll/enroll.message';
import { PrismaService } from '../src/prisma/prisma.service';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('Device enrolment flow (e2e, needs Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const operator = generateKeyPair();
  const opPk = hex(operator.publicKey);
  let opId = '';
  const created: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({ where: { publicKey: opPk } });
    opId = (await prisma.account.create({
      data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: opPk, displayName: 'Operator Enrol' },
    })).id;
  });
  afterAll(async () => {
    await prisma.enrollmentCode.deleteMany({ where: { issuedBy: opId } });
    await prisma.authChallenge.deleteMany({ where: { accountId: { in: [opId, ...created] } } });
    await prisma.account.deleteMany({ where: { id: { in: [opId, ...created] } } });
    await app.close();
  });

  async function login(kp: { privateKey: Uint8Array }, accountId: string): Promise<string> {
    const ch = await request(app.getHttpServer()).post('/auth/challenge').send({ accountId });
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage(accountId, ch.body.nonce)));
    const vr = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ accountId, nonce: ch.body.nonce, signature: sig });
    return vr.body.token;
  }

  async function issueCode(opToken: string) {
    const res = await request(app.getHttpServer())
      .post('/enroll/code')
      .set('Authorization', `Bearer ${opToken}`)
      .send({ displayName: 'Siti Aminah', nikCommitment: 'commit-siti', attributes: 'rt=002;domisili=CibeteungMuara' })
      .expect(201);
    return res.body.code as string;
  }

  it('operator issues a code; the device claims it and can then log in', async () => {
    const opToken = await login(operator, opId);
    const code = await issueCode(opToken);
    expect(code).toBeTruthy();

    // Device generates its key and proves possession over (code, publicKey).
    const device = generateKeyPair();
    const devPk = hex(device.publicKey);
    const pop = hex(signMessage(device.privateKey, buildEnrollMessage(code, devPk)));

    const claim = await request(app.getHttpServer())
      .post('/enroll/claim')
      .send({ code, publicKey: devPk, signature: pop })
      .expect(201);

    expect(claim.body.accountId).toBeTruthy();
    expect(claim.body.role).toBe('WARGA');
    expect(claim.body.displayName).toBe('Siti Aminah');
    created.push(claim.body.accountId);

    // The freshly enrolled device can authenticate straight away.
    const token = await login(device, claim.body.accountId);
    expect(token).toBeTruthy();

    // Identity came from the operator-verified code, not from the device.
    const acc = await prisma.account.findUnique({ where: { id: claim.body.accountId } });
    expect(acc?.nikCommitment).toBe('commit-siti');
    expect(acc?.attributes).toBe('rt=002;domisili=CibeteungMuara');
  });

  it('refuses to reuse a code that was already claimed', async () => {
    const opToken = await login(operator, opId);
    const code = await issueCode(opToken);

    const first = generateKeyPair();
    const firstPk = hex(first.publicKey);
    const r1 = await request(app.getHttpServer())
      .post('/enroll/claim')
      .send({ code, publicKey: firstPk, signature: hex(signMessage(first.privateKey, buildEnrollMessage(code, firstPk))) })
      .expect(201);
    created.push(r1.body.accountId);

    const second = generateKeyPair();
    const secondPk = hex(second.publicKey);
    await request(app.getHttpServer())
      .post('/enroll/claim')
      .send({ code, publicKey: secondPk, signature: hex(signMessage(second.privateKey, buildEnrollMessage(code, secondPk))) })
      .expect(400);
  });

  it('rejects a claim whose proof-of-possession does not match the public key', async () => {
    const opToken = await login(operator, opId);
    const code = await issueCode(opToken);

    const victim = generateKeyPair();      // key the attacker does NOT control
    const attacker = generateKeyPair();
    const victimPk = hex(victim.publicKey);
    // Attacker signs with their own key but submits the victim's public key.
    const badPop = hex(signMessage(attacker.privateKey, buildEnrollMessage(code, victimPk)));

    await request(app.getHttpServer())
      .post('/enroll/claim')
      .send({ code, publicKey: victimPk, signature: badPop })
      .expect(400);
  });

  it('rejects an unknown code', async () => {
    const device = generateKeyPair();
    const devPk = hex(device.publicKey);
    const code = 'ZZZZ-ZZZZ';
    await request(app.getHttpServer())
      .post('/enroll/claim')
      .send({ code, publicKey: devPk, signature: hex(signMessage(device.privateKey, buildEnrollMessage(code, devPk))) })
      .expect(400);
  });

  it('forbids a non-operator from issuing codes', async () => {
    await request(app.getHttpServer()).post('/enroll/code').send({ displayName: 'X', nikCommitment: 'y', attributes: 'z' }).expect(401);
  });
});
