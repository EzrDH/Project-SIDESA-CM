import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';
import { VerificationService } from '../src/letters/verification.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('VerificationService (integration)', () => {
  const prisma = new PrismaService();
  const letters = new LetterService(prisma);
  const verify = new VerificationService(prisma);
  const kades = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  let kadesId = '';
  let token = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    kadesId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'H. Asep' } })).id;
    const r = await letters.createRequest('w-verify', 'DOMISILI', { nama: 'Budi' });
    await letters.draft(r.id);
    const fs = await letters.forSigning(r.id);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.canonicalContent)));
    token = (await letters.sign(kadesId, r.id, sig)).qrToken;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: 'w-verify' } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'w-verify' } });
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    await prisma.$disconnect();
  });

  it('verifies a genuine letter by its QR token', async () => {
    const res = await verify.verifyByToken(token);
    expect(res.valid).toBe(true);
    expect(res.signer).toBe('H. Asep');
    expect(res.letterNumber).toBeTruthy();
  });

  it('reports invalid for an unknown token', async () => {
    expect((await verify.verifyByToken('deadbeef')).valid).toBe(false);
  });

  it('reports invalid if the stored content was tampered with', async () => {
    await prisma.letter.update({ where: { qrToken: token }, data: { canonicalContent: 'TAMPERED' } });
    expect((await verify.verifyByToken(token)).valid).toBe(false);
  });
});
