import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingService } from '../src/booking/booking.service';

describe('BookingService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new BookingService(prisma);
  const slot = '2026-08-15T10:00:00.000Z';

  beforeAll(async () => { await prisma.$connect(); await prisma.booking.deleteMany({ where: { wargaAccountId: { in: ['bw-1', 'bw-2'] } } }); });
  afterAll(async () => { await prisma.booking.deleteMany({ where: { wargaAccountId: { in: ['bw-1', 'bw-2'] } } }); await prisma.$disconnect(); });

  it('creates, confirms, and checks in a booking', async () => {
    const b = await svc.create('bw-1', 'Konsultasi lahan', slot);
    const conf = await svc.confirm(b.id);
    expect(conf.status).toBe('CONFIRMED');
    const ci = await svc.checkin(b.checkinToken);
    expect(ci.status).toBe('CHECKED_IN');
  });

  it('refuses a second booking confirmed at the same slot', async () => {
    const b2 = await svc.create('bw-2', 'Tanda tangan', slot);
    await expect(svc.confirm(b2.id)).rejects.toThrow();
  });

  it('does not check in a booking that is not confirmed', async () => {
    const b = await svc.create('bw-1', 'X', '2026-08-16T10:00:00.000Z');
    await expect(svc.checkin(b.checkinToken)).rejects.toThrow();
  });
});
