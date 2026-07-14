import { domainHash } from '@sidesa/crypto';

const enc = new TextEncoder();
export const GENESIS_HASH = '0'.repeat(96);

export interface AuditFields {
  actor: string;
  action: string;
  target: string;
  payloadHash: string;
  createdAt: string;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function computeEntryHash(prevHash: string, f: AuditFields): string {
  return bytesToHex(
    domainHash(
      'SIDESA-audit-v1',
      hexToBytes(prevHash),
      enc.encode(f.actor),
      enc.encode(f.action),
      enc.encode(f.target),
      enc.encode(f.payloadHash),
      enc.encode(f.createdAt),
    ),
  );
}

export function verifyChain(
  entries: (AuditFields & { prevHash: string; entryHash: string })[],
): boolean {
  let prev = GENESIS_HASH;
  for (const e of entries) {
    if (e.prevHash !== prev) return false;
    if (computeEntryHash(e.prevHash, e) !== e.entryHash) return false;
    prev = e.entryHash;
  }
  return true;
}
