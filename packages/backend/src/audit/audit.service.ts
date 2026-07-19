import { Injectable } from '@nestjs/common';
import { domainHash } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GENESIS_HASH, computeEntryHash, verifyChain } from './audit.chain';

const enc = new TextEncoder();
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/// Append-only, hash-chained audit trail for sensitive actions. Each entry binds
/// to the previous entry's hash, so any later edit or deletion breaks the chain
/// and is detected by verify().
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actor: string, action: string, target: string, payload: Record<string, unknown>): Promise<void> {
    const payloadHash = bytesToHex(domainHash('SIDESA-audit-payload-v1', enc.encode(JSON.stringify(payload))));
    // A transaction serializes concurrent appends so the chain has no forks.
    await this.prisma.$transaction(async (tx) => {
      const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' } });
      const prevHash = last?.entryHash ?? GENESIS_HASH;
      const createdAt = new Date();
      const entryHash = computeEntryHash(prevHash, {
        actor,
        action,
        target,
        payloadHash,
        createdAt: createdAt.toISOString(),
      });
      await tx.auditLog.create({
        data: { actor, action, target, payloadHash, prevHash, entryHash, createdAt },
      });
    });
  }

  async verify(): Promise<{ valid: boolean; count: number }> {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    const entries = rows.map((r) => ({
      actor: r.actor,
      action: r.action,
      target: r.target,
      payloadHash: r.payloadHash,
      createdAt: r.createdAt.toISOString(),
      prevHash: r.prevHash,
      entryHash: r.entryHash,
    }));
    return { valid: verifyChain(entries), count: rows.length };
  }

  async recent(limit = 50) {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { seq: 'desc' }, take: limit });
    return rows.map((r) => ({ seq: r.seq, actor: r.actor, action: r.action, target: r.target, createdAt: r.createdAt }));
  }
}
