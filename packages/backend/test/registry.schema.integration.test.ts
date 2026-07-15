import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('registry schema (integration)', () => {
  const prisma = new PrismaService();
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.registryVersion.deleteMany({ where: { root: 'root-probe' } });
    await prisma.$disconnect();
  });

  it('stores a registry version and reads it back', async () => {
    const v = await prisma.registryVersion.create({ data: { root: 'root-probe', active: false } });
    const found = await prisma.registryVersion.findUnique({ where: { id: v.id } });
    expect(found?.root).toBe('root-probe');
    expect(found?.active).toBe(false);
  });
});
