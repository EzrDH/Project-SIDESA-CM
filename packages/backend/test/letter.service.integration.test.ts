import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('LetterService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new LetterService(prisma);
  const kades = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  let kadesId = '';
  let requestId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    kadesId = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'H. Asep' } })).id;
  });
  afterAll(async () => {
    const reqs = await prisma.letterRequest.findMany({ where: { wargaAccountId: 'w-1' } });
    await prisma.letter.deleteMany({ where: { requestId: { in: reqs.map((r) => r.id) } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'w-1' } });
    await prisma.account.deleteMany({ where: { publicKey: kadesPk } });
    await prisma.$disconnect();
  });

  it('runs request -> draft -> sign and issues a verifiable letter', async () => {
    const r = await svc.createRequest('w-1', 'DOMISILI', { nama: 'Budi', alamat: 'RT 01' });
    requestId = r.id;

    const draft = await svc.draft(requestId);
    expect(draft.letterNumber).toMatch(/DOMISILI|SKD|\//);
    expect(draft.canonicalContent).toContain(draft.letterNumber);

    const fs = await svc.forSigning(requestId);
    const sig = hex(signMessage(kades.privateKey, enc.encode(fs.canonicalContent)));
    const issued = await svc.sign(kadesId, requestId, sig);
    expect(issued.qrToken).toBeTruthy();

    const letter = await prisma.letter.findUnique({ where: { requestId } });
    expect(letter?.signature).toBe(sig);
    expect((await prisma.letterRequest.findUnique({ where: { id: requestId } }))?.status).toBe('SIGNED');
  });

  it('rejects a signature that does not match the canonical content', async () => {
    const r = await svc.createRequest('w-1', 'SKTM', { nama: 'Siti' });
    await svc.draft(r.id);
    const wrong = generateKeyPair();
    const badSig = hex(signMessage(wrong.privateKey, enc.encode('not the document')));
    await expect(svc.sign(kadesId, r.id, badSig)).rejects.toThrow();
  });
});
