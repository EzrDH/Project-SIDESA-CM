import { describe, it, expect } from 'vitest';
import { randomScalar, derivePublic, proveEligibility, verifyEligibility } from '@sidesa/crypto';
import { buildRegistryTree, rootHex, bytesToHex, RegistryEntry } from '../src/registry/registry.builder';

const enc = new TextEncoder();

describe('registry builder', () => {
  it('builds a tree whose proofs satisfy crypto verifyEligibility', () => {
    const secrets = [randomScalar(), randomScalar(), randomScalar()];
    const attrs = ['rt=001', 'rt=002', 'rt=003'];
    const entries: RegistryEntry[] = secrets.map((s, i) => ({ publicKey: bytesToHex(derivePublic(s)), attributes: attrs[i] }));
    const tree = buildRegistryTree(entries);

    const ctx = enc.encode('permohonan#1');
    const proof = proveEligibility(secrets[1], enc.encode(attrs[1]), tree, 1, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });

  it('produces a stable 96-hex root', () => {
    const entries: RegistryEntry[] = [{ publicKey: bytesToHex(derivePublic(randomScalar())), attributes: 'a' }];
    expect(rootHex(buildRegistryTree(entries))).toMatch(/^[0-9a-f]{96}$/);
  });
});
