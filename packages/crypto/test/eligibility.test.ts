import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { MerkleTree } from '../src/merkle';
import { generateKeyPair, getPublicKey } from '../src/ecdsa';
import { computeLeaf, proveEligibility, verifyEligibility } from '../src/eligibility';

function buildRegistry(count: number) {
  const keys = Array.from({ length: count }, () => generateKeyPair());
  const attrs = Array.from({ length: count }, (_, i) => utf8ToBytes(`rt=00${i};domisili=CibeteungMuara`));
  const leafData = keys.map((k, i) => computeLeaf(k.publicKey, attrs[i]));
  const tree = new MerkleTree(leafData);
  return { keys, attrs, tree };
}

describe('eligibility proof', () => {
  it('accepts a genuine resident with a valid proof', () => {
    const { keys, attrs, tree } = buildRegistry(6);
    const ctx = utf8ToBytes('permohonan#100');
    const proof = proveEligibility(keys[3].privateKey, attrs[3], tree, 3, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });

  it('rejects a non-member (key not in the registry)', () => {
    const { tree } = buildRegistry(6);
    const outsider = generateKeyPair();
    const outsiderAttrs = utf8ToBytes('rt=001;domisili=CibeteungMuara');
    const ctx = utf8ToBytes('c');
    const fakeTree = new MerkleTree([computeLeaf(outsider.publicKey, outsiderAttrs)]);
    const proof = proveEligibility(outsider.privateKey, outsiderAttrs, fakeTree, 0, ctx);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(false); // wrong (real) root
  });

  it('rejects a replayed proof under a different request context', () => {
    const { keys, attrs, tree } = buildRegistry(4);
    const proof = proveEligibility(keys[1].privateKey, attrs[1], tree, 1, utf8ToBytes('permohonan#1'));
    expect(verifyEligibility(proof, tree.root, utf8ToBytes('permohonan#2'))).toBe(false);
  });

  it('rejects attribute tampering after the proof is built', () => {
    const { keys, attrs, tree } = buildRegistry(4);
    const ctx = utf8ToBytes('c');
    const proof = proveEligibility(keys[2].privateKey, attrs[2], tree, 2, ctx);
    proof.attributes = utf8ToBytes('rt=999;domisili=Elsewhere'); // forge attributes
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(false);
  });

  it('rejects an impersonator who copies a real public key but lacks the secret', () => {
    const { keys, attrs, tree } = buildRegistry(4);
    const ctx = utf8ToBytes('c');
    const honest = proveEligibility(keys[0].privateKey, attrs[0], tree, 0, ctx);
    const attacker = proveEligibility(generateKeyPair().privateKey, attrs[0], tree, 0, ctx);
    const forged = { ...honest, ownership: attacker.ownership };
    expect(verifyEligibility(forged, tree.root, ctx)).toBe(false);
  });
});
