import { p384 } from '@noble/curves/nist';
import { sha384 } from '@noble/hashes/sha512';

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = p384.utils.randomPrivateKey();
  const publicKey = p384.getPublicKey(privateKey, true); // compressed
  return { privateKey, publicKey };
}

export function getPublicKey(privateKey: Uint8Array): Uint8Array {
  return p384.getPublicKey(privateKey, true);
}

export function signMessage(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  const digest = sha384(message);
  const sig = p384.sign(digest, privateKey);
  return sig.toCompactRawBytes();
}

export function verifyMessage(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): boolean {
  const digest = sha384(message);
  return p384.verify(signature, digest, publicKey);
}
