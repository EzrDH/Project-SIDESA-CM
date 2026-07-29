import { MerkleTree, ProofStep, verifyProof } from './merkle';
import { derivePublic, secretFromBytes, proveKnowledge, verifyKnowledge, encodeProof, decodeProof } from './schnorr';
import { domainHash } from './hash';

export function computeLeaf(publicKey: Uint8Array, attributes: Uint8Array): Uint8Array {
  return domainHash('SIDESA-resident-leaf-v1', publicKey, attributes);
}

export interface EligibilityProof {
  publicKey: Uint8Array;    // revealed pseudonymous identity key P
  attributes: Uint8Array;   // revealed attributes required for the service
  merkleProof: ProofStep[]; // membership of the leaf under the signed root
  ownership: Uint8Array;    // 97-byte encoded Schnorr proof over context (proves control of P)
}

export function proveEligibility(
  privateKey: Uint8Array,
  attributes: Uint8Array,
  tree: MerkleTree,
  leafIndex: number,
  context: Uint8Array
): EligibilityProof {
  const secret = secretFromBytes(privateKey);
  const publicKey = derivePublic(secret);
  const merkleProof = tree.getProof(leafIndex);
  // Schnorr proof of knowledge of the scalar behind publicKey, bound to the
  // single-use request context. Reveals nothing about the secret, and a captured
  // proof is worthless under any other context.
  const ownership = encodeProof(proveKnowledge(secret, publicKey, context));
  return { publicKey, attributes, merkleProof, ownership };
}

export function verifyEligibility(
  proof: EligibilityProof,
  signedRoot: Uint8Array,
  context: Uint8Array
): boolean {
  const leaf = computeLeaf(proof.publicKey, proof.attributes);
  if (!verifyProof(leaf, proof.merkleProof, signedRoot)) return false; // registered resident?
  try {
    return verifyKnowledge(proof.publicKey, decodeProof(proof.ownership), context);
  } catch {
    return false;
  }
}
