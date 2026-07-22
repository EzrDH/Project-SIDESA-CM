import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DeviceToken schema (needs Postgres)', () => {
  const prisma = new PrismaService();
  const acc = 'acc-devtoken-test';
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.deviceToken.deleteMany({ where: { accountId: acc } });
  });
  afterAll(async () => {
    await prisma.deviceToken.deleteMany({ where: { accountId: acc } });
    await prisma.$disconnect();
  });

  it('stores a token uniquely and upserts on the token key', async () => {
    await prisma.deviceToken.create({ data: { accountId: acc, token: 'tok-1', platform: 'android' } });
    await expect(
      prisma.deviceToken.create({ data: { accountId: acc, token: 'tok-1', platform: 'android' } }),
    ).rejects.toThrow(); // unique(token)
    const rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe('android');
  });
});
