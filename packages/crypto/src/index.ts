export const VERSION = '0.1.0';

export { hash, hashUtf8, domainHash } from './hash';
export { generateKeyPair, getPublicKey, signMessage, verifyMessage } from './ecdsa';
export type { KeyPair } from './ecdsa';
export { MerkleTree, verifyProof, hashLeaf } from './merkle';
export type { ProofStep } from './merkle';
export { randomScalar, derivePublic, proveKnowledge, verifyKnowledge } from './schnorr';
export type { SchnorrProof } from './schnorr';
export { computeLeaf, proveEligibility, verifyEligibility } from './eligibility';
export type { EligibilityProof } from './eligibility';
