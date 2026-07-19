import { describe, it, expect } from 'vitest';
import { generateKeyPair, proveEligibility } from '@sidesa/crypto';
import { buildRegistryTree, rootHex, bytesToHex } from '../src/registry/registry.builder';
import { EligibilityService } from '../src/registry/eligibility.service';

const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('EligibilityService.verify', () => {
  const kp = generateKeyPair();
  const attrs = 'rt=007';
  const entries = [{ publicKey: bytesToHex(kp.publicKey), attributes: attrs }];
  const tree = buildRegistryTree(entries);
  const prismaStub = {} as any; // verify() doesn't touch the DB
  const svc = new EligibilityService({ activeRootHex: async () => rootHex(tree) } as any, prismaStub);

  function dtoFor(context: string) {
    const p = proveEligibility(kp.privateKey, enc.encode(attrs), tree, 0, enc.encode(context));
    return {
      publicKey: hex(p.publicKey),
      attributes: attrs,
      merkleProof: p.merkleProof.map((s) => ({ sibling: hex(s.sibling), isRight: s.isRight })),
      ownership: hex(p.ownership),
    };
  }

  it('accepts a valid proof under the same context', async () => {
    expect((await svc.verify(dtoFor('req-1'), 'req-1')).valid).toBe(true);
  });

  it('rejects a proof replayed under a different context', async () => {
    expect((await svc.verify(dtoFor('req-1'), 'req-2')).valid).toBe(false);
  });

  it('rejects when there is no active root', async () => {
    const svc2 = new EligibilityService({ activeRootHex: async () => null } as any, prismaStub);
    expect((await svc2.verify(dtoFor('req-1'), 'req-1')).valid).toBe(false);
  });
});
