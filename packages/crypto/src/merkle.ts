import { sha384 } from '@noble/hashes/sha512';
import { concatBytes } from '@noble/hashes/utils';

const LEAF = Uint8Array.of(0x00);
const NODE = Uint8Array.of(0x01);

export interface ProofStep {
  sibling: Uint8Array;
  isRight: boolean;
}

export function hashLeaf(data: Uint8Array): Uint8Array {
  return sha384(concatBytes(LEAF, data));
}

function hashNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha384(concatBytes(NODE, left, right));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class MerkleTree {
  readonly leaves: Uint8Array[];
  private readonly layers: Uint8Array[][];

  constructor(leafData: Uint8Array[]) {
    if (leafData.length === 0) throw new Error('MerkleTree requires at least one leaf');
    this.leaves = leafData.map(hashLeaf);
    this.layers = [this.leaves];
    let current = this.leaves;
    while (current.length > 1) {
      const next: Uint8Array[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate last if odd
        next.push(hashNode(left, right));
      }
      this.layers.push(next);
      current = next;
    }
  }

  get root(): Uint8Array {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): ProofStep[] {
    if (index < 0 || index >= this.leaves.length) throw new Error('index out of range');
    const proof: ProofStep[] = [];
    let idx = index;
    for (let l = 0; l < this.layers.length - 1; l++) {
      const layer = this.layers[l];
      const isRightNode = idx % 2 === 1;
      const siblingIdx = isRightNode ? idx - 1 : idx + 1;
      const sibling = siblingIdx < layer.length ? layer[siblingIdx] : layer[idx]; // odd -> duplicate self
      proof.push({ sibling, isRight: !isRightNode });
      idx = Math.floor(idx / 2);
    }
    return proof;
  }
}

export function verifyProof(leafData: Uint8Array, proof: ProofStep[], root: Uint8Array): boolean {
  let acc = hashLeaf(leafData);
  for (const step of proof) {
    acc = step.isRight ? hashNode(acc, step.sibling) : hashNode(step.sibling, acc);
  }
  return equalBytes(acc, root);
}
