import { describe, it, expect } from 'vitest';
import {
  PROOF_BYTES, encodeProof, decodeProof, secretFromBytes,
  proveKnowledge, verifyKnowledge, derivePublic, randomScalar,
} from '../src/index';

const enc = new TextEncoder();

describe('Schnorr proof wire codec', () => {
  it('round-trips a proof through 97 bytes', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const ctx = enc.encode('SIDESA-auth-v1|acc-1|nonce-1');
    const p = proveKnowledge(x, X, ctx);

    const bytes = encodeProof(p);
    expect(bytes.length).toBe(PROOF_BYTES);
    expect(PROOF_BYTES).toBe(97);

    const back = decodeProof(bytes);
    expect(verifyKnowledge(X, back, ctx)).toBe(true);
  });

  it('rejects a proof of the wrong length', () => {
    expect(() => decodeProof(new Uint8Array(96))).toThrow();
    expect(() => decodeProof(new Uint8Array(98))).toThrow();
  });

  it('rejects a decoded proof whose bytes were tampered with', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const ctx = enc.encode('SIDESA-auth-v1|acc-1|nonce-1');
    const bytes = encodeProof(proveKnowledge(x, X, ctx));
    bytes[80] ^= 0x01; // flip a bit inside s
    expect(verifyKnowledge(X, decodeProof(bytes), ctx)).toBe(false);
  });

  it('converts a 48-byte secret and rejects zero', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const asBytes = new Uint8Array(48);
    // big-endian encode x
    let v = x;
    for (let i = 47; i >= 0; i--) { asBytes[i] = Number(v & 0xffn); v >>= 8n; }
    expect(secretFromBytes(asBytes)).toBe(x);
    expect(derivePublic(secretFromBytes(asBytes))).toEqual(X);
    expect(() => secretFromBytes(new Uint8Array(48))).toThrow();
  });
});
