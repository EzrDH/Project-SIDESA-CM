import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('booking schema (integration)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { wargaAccountId: 'probe-b' } });
    await prisma.$disconnect();
  });

  it('stores a booking', async () => {
    const b = await prisma.booking.create({
      data: { wargaAccountId: 'probe-b', purpose: 'Konsultasi', requestedSlot: new Date('2026-08-01T09:00:00Z'), checkinToken: `t-${Date.now()}` },
    });
    const found = await prisma.booking.findUnique({ where: { id: b.id } });
    expect(found?.status).toBe('REQUESTED');
    expect(found?.purpose).toBe('Konsultasi');
  });
});
