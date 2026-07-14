import { MerkleTree, ProofStep, verifyProof } from './merkle';
import { proveKnowledge, verifyKnowledge, derivePublic, SchnorrProof } from './schnorr';
import { domainHash } from './hash';

export function computeLeaf(publicKey: Uint8Array, attributes: Uint8Array): Uint8Array {
  return domainHash('SIDESA-resident-leaf-v1', publicKey, attributes);
}

export interface EligibilityProof {
  publicKey: Uint8Array;    // revealed pseudonymous identity key P
  attributes: Uint8Array;   // revealed attributes required for the service
  merkleProof: ProofStep[]; // membership of the leaf under the signed root
  ownership: SchnorrProof;  // PoK of secret x s.t. P = xG, bound to context
}

export function proveEligibility(
  secret: bigint,
  attributes: Uint8Array,
  tree: MerkleTree,
  leafIndex: number,
  context: Uint8Array
): EligibilityProof {
  const publicKey = derivePublic(secret);
  const merkleProof = tree.getProof(leafIndex);
  const ownership = proveKnowledge(secret, publicKey, context);
  return { publicKey, attributes, merkleProof, ownership };
}

export function verifyEligibility(
  proof: EligibilityProof,
  signedRoot: Uint8Array,
  context: Uint8Array
): boolean {
  const leaf = computeLeaf(proof.publicKey, proof.attributes);
  if (!verifyProof(leaf, proof.merkleProof, signedRoot)) return false; // registered resident?
  if (!verifyKnowledge(proof.publicKey, proof.ownership, context)) return false; // owns key + bound to request
  return true;
}
