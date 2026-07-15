import { MerkleTree, computeLeaf } from '@sidesa/crypto';

export interface RegistryEntry {
  publicKey: string; // compressed P-384 point, hex
  attributes: string; // canonical utf8 string
}

const enc = new TextEncoder();

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function buildRegistryTree(entries: RegistryEntry[]): MerkleTree {
  const leaves = entries.map((e) => computeLeaf(hexToBytes(e.publicKey), enc.encode(e.attributes)));
  return new MerkleTree(leaves);
}

export function rootHex(tree: MerkleTree): string {
  return bytesToHex(tree.root);
}
