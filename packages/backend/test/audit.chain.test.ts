import { describe, it, expect } from 'vitest';
import { GENESIS_HASH, computeEntryHash, verifyChain, AuditFields } from '../src/audit/audit.chain';

function entry(f: AuditFields, prevHash: string) {
  return { ...f, prevHash, entryHash: computeEntryHash(prevHash, f) };
}

describe('audit chain', () => {
  const a: AuditFields = { actor: 'admin', action: 'CREATE_ACCOUNT', target: 'acc-1', payloadHash: 'aa', createdAt: '2026-07-14T00:00:00Z' };
  const b: AuditFields = { actor: 'operator', action: 'APPROVE_WARGA', target: 'acc-2', payloadHash: 'bb', createdAt: '2026-07-14T00:01:00Z' };

  it('links entries and verifies a valid chain', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    expect(verifyChain([e1, e2])).toBe(true);
  });

  it('detects a tampered field', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    const tampered = { ...e1, action: 'DELETE_EVERYTHING' };
    expect(verifyChain([tampered, e2])).toBe(false);
  });

  it('detects a broken link (reordered/removed entry)', () => {
    const e1 = entry(a, GENESIS_HASH);
    const e2 = entry(b, e1.entryHash);
    expect(verifyChain([e2, e1])).toBe(false);
  });
});
