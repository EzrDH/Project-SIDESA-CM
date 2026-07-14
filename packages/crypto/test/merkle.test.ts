import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { MerkleTree, verifyProof, hashLeaf } from '../src/merkle';

const leaves = ['nik-1', 'nik-2', 'nik-3', 'nik-4', 'nik-5'].map(utf8ToBytes);

describe('merkle tree', () => {
  it('verifies a valid proof for every leaf (odd count included)', () => {
    const tree = new MerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.getProof(i);
      expect(verifyProof(leaves[i], proof, tree.root)).toBe(true);
    }
  });

  it('rejects a proof against a non-member leaf', () => {
    const tree = new MerkleTree(leaves);
    const proof = tree.getProof(0);
    expect(verifyProof(utf8ToBytes('nik-999'), proof, tree.root)).toBe(false);
  });

  it('rejects a proof against a wrong root', () => {
    const tree = new MerkleTree(leaves);
    const other = new MerkleTree(['x', 'y'].map(utf8ToBytes));
    expect(verifyProof(leaves[0], tree.getProof(0), other.root)).toBe(false);
  });

  it('single-leaf tree: root equals hashLeaf, empty proof verifies', () => {
    const tree = new MerkleTree([utf8ToBytes('solo')]);
    expect(tree.getProof(0)).toEqual([]);
    expect(tree.root).toEqual(hashLeaf(utf8ToBytes('solo')));
    expect(verifyProof(utf8ToBytes('solo'), [], tree.root)).toBe(true);
  });

  it('throws on empty leaf set', () => {
    expect(() => new MerkleTree([])).toThrow();
  });
});
