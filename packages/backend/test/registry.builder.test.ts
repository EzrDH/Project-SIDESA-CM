import { describe, it, expect } from 'vitest';
import { generateKeyPair, proveEligibility, verifyEligibility } from '@sidesa/crypto';
import { buildRegistryTree, rootHex, bytesToHex, RegistryEntry } from '../src/registry/registry.builder';

const enc = new TextEncoder();

describe('registry builder', () => {
  it('builds a tree whose proofs satisfy crypto verifyEligibility', () => {
    const keys = [generateKeyPair(), generateKeyPair(), generateKeyPair()];
    const attrs = ['rt=001', 'rt=002', 'rt=003'];
    const entries: RegistryEntry[] = keys.map((k, i) => ({ publicKey: bytesToHex(k.publicKey), attributes: attrs[i] }));
    const tree = buildRegistryTree(entries);

    const ctx = enc.encode('permohonan#1');
    const proof = proveEligibility(keys[1].privateKey, enc.encode(attrs[1]), tree, 1, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });

  it('produces a stable 96-hex root', () => {
    const entries: RegistryEntry[] = [{ publicKey: bytesToHex(generateKeyPair().publicKey), attributes: 'a' }];
    expect(rootHex(buildRegistryTree(entries))).toMatch(/^[0-9a-f]{96}$/);
  });
});
