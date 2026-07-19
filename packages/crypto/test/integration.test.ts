import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import {
  generateKeyPair, signMessage, verifyMessage,
  MerkleTree, computeLeaf, proveEligibility, verifyEligibility,
} from '../src/index';

describe('end-to-end village flow', () => {
  it('desa signs registry root; resident proves eligibility; verifier checks both', () => {
    // 1. Enroll residents -> build registry
    const residents = Array.from({ length: 5 }, () => generateKeyPair());
    const attrs = residents.map((_, i) => utf8ToBytes(`rt=00${i}`));
    const leafData = residents.map((k, i) => computeLeaf(k.publicKey, attrs[i]));
    const tree = new MerkleTree(leafData);

    // 2. Kepala Desa ECDSA-signs the Merkle root
    const kades = generateKeyPair();
    const rootSig = signMessage(kades.privateKey, tree.root);
    expect(verifyMessage(kades.publicKey, tree.root, rootSig)).toBe(true);

    // 3. A resident proves eligibility for a specific request
    const ctx = utf8ToBytes('permohonan:SKTM:2026-07-10:seq=7');
    const proof = proveEligibility(residents[2].privateKey, attrs[2], tree, 2, ctx);

    // 4. Verifier: (a) trust the root via ECDSA, (b) check eligibility against it
    expect(verifyMessage(kades.publicKey, tree.root, rootSig)).toBe(true);
    expect(verifyEligibility(proof, tree.root, ctx)).toBe(true);
  });
});
