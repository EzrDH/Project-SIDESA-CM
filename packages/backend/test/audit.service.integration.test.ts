import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';

describe('AuditService (integration, needs Postgres)', () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.auditLog.deleteMany({});
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.$disconnect();
  });

  it('records a hash-chained, append-only log that verifies', async () => {
    await audit.record('op-1', 'LETTER_DRAFT', 'req-1', { letterNumber: '1/SKD/2026' });
    await audit.record('kades-1', 'LETTER_SIGN', 'req-1', { qrToken: 'abc' });
    await audit.record('op-1', 'REGISTRY_PUBLISH', 'v1', { version: 1 });

    const v = await audit.verify();
    expect(v.count).toBe(3);
    expect(v.valid).toBe(true);
  });

  it('detects tampering with any entry', async () => {
    const first = await prisma.auditLog.findFirst({ orderBy: { seq: 'asc' } });
    await prisma.auditLog.update({ where: { id: first!.id }, data: { action: 'FORGED' } });

    const v = await audit.verify();
    expect(v.valid).toBe(false);
  });
});
