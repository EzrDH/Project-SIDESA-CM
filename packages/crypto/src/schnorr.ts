import { p384 } from '@noble/curves/nist';
import { mod } from '@noble/curves/abstract/modular';
import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';
import { randomBytes } from '@noble/hashes/utils';
import { domainHash } from './hash';

const Point = p384.ProjectivePoint;
const N = p384.CURVE.n;
const SCALAR_BYTES = 48;

export interface SchnorrProof {
  R: Uint8Array; // compressed commitment point
  s: Uint8Array; // response scalar, 48 bytes big-endian
}

export function randomScalar(): bigint {
  // 64 bytes reduced mod n removes modulo bias; retry on the negligible zero case.
  for (;;) {
    const s = mod(bytesToNumberBE(randomBytes(64)), N);
    if (s !== 0n) return s;
  }
}

export function derivePublic(secret: bigint): Uint8Array {
  return Point.BASE.multiply(secret).toRawBytes(true);
}

function challenge(publicKey: Uint8Array, R: Uint8Array, context: Uint8Array): bigint {
  const h = domainHash('SIDESA-schnorr-v1', publicKey, R, context);
  return mod(bytesToNumberBE(h), N);
}

export function proveKnowledge(
  secret: bigint,
  publicKey: Uint8Array,
  context: Uint8Array
): SchnorrProof {
  for (;;) {
    const k = randomScalar();
    const Rbytes = Point.BASE.multiply(k).toRawBytes(true);
    const c = challenge(publicKey, Rbytes, context);
    if (c === 0n) continue; // negligible; keeps c in [1, n-1]
    const s = mod(k + c * secret, N);
    if (s === 0n) continue;
    return { R: Rbytes, s: numberToBytesBE(s, SCALAR_BYTES) };
  }
}

export function verifyKnowledge(
  publicKey: Uint8Array,
  proof: SchnorrProof,
  context: Uint8Array
): boolean {
  let P, R;
  try {
    P = Point.fromHex(publicKey);
    R = Point.fromHex(proof.R);
  } catch {
    return false;
  }
  const s = bytesToNumberBE(proof.s);
  if (s <= 0n || s >= N) return false;
  const c = challenge(publicKey, proof.R, context);
  if (c === 0n) return false;
  // Verify s*G == R + c*P
  const lhs = Point.BASE.multiply(s);
  const rhs = R.add(P.multiply(c));
  return lhs.equals(rhs);
}

const POINT_BYTES = 49;
export const PROOF_BYTES = POINT_BYTES + SCALAR_BYTES; // 49 + 48 = 97

/** Wire form of a proof: compressed commitment R followed by the scalar s. */
export function encodeProof(p: SchnorrProof): Uint8Array {
  if (p.R.length !== POINT_BYTES || p.s.length !== SCALAR_BYTES) {
    throw new Error('SchnorrProof has an unexpected shape');
  }
  const out = new Uint8Array(PROOF_BYTES);
  out.set(p.R, 0);
  out.set(p.s, POINT_BYTES);
  return out;
}

export function decodeProof(bytes: Uint8Array): SchnorrProof {
  if (bytes.length !== PROOF_BYTES) {
    throw new Error(`Schnorr proof must be ${PROOF_BYTES} bytes, got ${bytes.length}`);
  }
  return { R: bytes.slice(0, POINT_BYTES), s: bytes.slice(POINT_BYTES) };
}

/**
 * Read a stored private key (48-byte big-endian) as a Schnorr secret. The same
 * scalar yields the same public key as ECDSA does, so enrolled keys keep working.
 */
export function secretFromBytes(bytes: Uint8Array): bigint {
  const x = bytesToNumberBE(bytes);
  if (x <= 0n || x >= N) throw new Error('secret out of range');
  return x;
}
