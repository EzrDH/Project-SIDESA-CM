import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('letter schema (integration)', () => {
  const prisma = new PrismaService();
  let reqId = '';
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: 'probe-warga' } });
    await prisma.$disconnect();
  });

  it('stores a letter request', async () => {
    const r = await prisma.letterRequest.create({
      data: { wargaAccountId: 'probe-warga', type: 'DOMISILI', formData: '{}' },
    });
    reqId = r.id;
    const found = await prisma.letterRequest.findUnique({ where: { id: reqId } });
    expect(found?.status).toBe('SUBMITTED');
    expect(found?.type).toBe('DOMISILI');
  });
});
