import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';

describe('LetterService.listForWarga (integration)', () => {
  const prisma = new PrismaService();
  const svc = new LetterService(prisma);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'mine-w' } });
  });
  afterAll(async () => {
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'mine-w' } });
    await prisma.$disconnect();
  });

  it("returns only the warga's own requests, newest first", async () => {
    await svc.createRequest('mine-w', 'DOMISILI', { nama: 'Budi' });
    await svc.createRequest('mine-w', 'SKTM', { nama: 'Budi' });
    await svc.createRequest('other-w', 'DOMISILI', { nama: 'Siti' });

    const mine = await svc.listForWarga('mine-w');
    expect(mine).toHaveLength(2);
    expect(mine.every((r) => ['DOMISILI', 'SKTM'].includes(r.type))).toBe(true);
    expect(mine[0]).toHaveProperty('status');
    expect(mine[0]).toHaveProperty('letterNumber');

    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'other-w' } });
  });
});
