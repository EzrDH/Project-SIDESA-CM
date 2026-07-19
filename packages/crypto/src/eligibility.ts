import { MerkleTree, ProofStep, verifyProof } from './merkle';
import { getPublicKey, signMessage, verifyMessage } from './ecdsa';
import { domainHash } from './hash';

export function computeLeaf(publicKey: Uint8Array, attributes: Uint8Array): Uint8Array {
  return domainHash('SIDESA-resident-leaf-v1', publicKey, attributes);
}

export interface EligibilityProof {
  publicKey: Uint8Array;    // revealed pseudonymous identity key P
  attributes: Uint8Array;   // revealed attributes required for the service
  merkleProof: ProofStep[]; // membership of the leaf under the signed root
  ownership: Uint8Array;    // compact ECDSA signature over context (proves control of P)
}

export function proveEligibility(
  privateKey: Uint8Array,
  attributes: Uint8Array,
  tree: MerkleTree,
  leafIndex: number,
  context: Uint8Array
): EligibilityProof {
  const publicKey = getPublicKey(privateKey);
  const merkleProof = tree.getProof(leafIndex);
  // ECDSA signature over the (domain-separated, nonce-bearing) context. Equivalent
  // proof-of-control to the previous Schnorr PoK, but usable by hardware keys that
  // only expose ECDSA. The context is single-use, so the signature cannot be replayed.
  const ownership = signMessage(privateKey, context);
  return { publicKey, attributes, merkleProof, ownership };
}

export function verifyEligibility(
  proof: EligibilityProof,
  signedRoot: Uint8Array,
  context: Uint8Array
): boolean {
  const leaf = computeLeaf(proof.publicKey, proof.attributes);
  if (!verifyProof(leaf, proof.merkleProof, signedRoot)) return false; // registered resident?
  if (!verifyMessage(proof.publicKey, context, proof.ownership)) return false; // owns key + bound to request
  return true;
}
