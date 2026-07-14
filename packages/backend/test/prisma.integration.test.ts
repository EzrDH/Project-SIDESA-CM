import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('prisma (integration, needs Postgres)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.account.deleteMany({ where: { displayName: 'IT Probe' } });
    await prisma.$disconnect();
  });

  it('creates and reads an account', async () => {
    const created = await prisma.account.create({
      data: { role: 'WARGA', status: 'PENDING', publicKey: `pk-${Date.now()}`, displayName: 'IT Probe' },
    });
    const found = await prisma.account.findUnique({ where: { id: created.id } });
    expect(found?.displayName).toBe('IT Probe');
    expect(found?.role).toBe('WARGA');
  });
});
