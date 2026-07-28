import { describe, it, expect } from 'vitest';
import {
  PROOF_BYTES, encodeProof, decodeProof, secretFromBytes,
  proveKnowledge, verifyKnowledge, derivePublic, randomScalar,
} from '../src/index';
import { domainHash } from '../src/hash';

const enc = new TextEncoder();

// Cross-language known-answer test: this exact hex is asserted against both
// this domainHash() and Dart's schnorrDomainHash() in
// packages/app/test/schnorr_test.dart. It exists so the two languages can be
// checked against a fixed, hardcoded target instead of relying on a shared
// artefact written by one suite and read by the other (see
// packages/crypto/test/interop.schnorr.test.ts for why that was unsound).
// If you change the domain construction on one side, this constant will only
// catch you if you remember to update it on BOTH sides — that mismatch is
// exactly the bug this test is designed to catch.
const DOMAIN_HASH_KAT_HEX =
  'c604367af3418e34ffa9036605a4ad3df942b7c2dbab90ccb25443870b458c79eae0ae55c7487fd506f8bd6ff8d14676';

describe('domainHash known-answer test (cross-language with Dart)', () => {
  it('matches the hardcoded KAT for fixed inputs', () => {
    const h = domainHash(
      'SIDESA-schnorr-v1',
      enc.encode('kat-publicKey'),
      enc.encode('kat-R'),
      enc.encode('kat-context'),
    );
    const hex = Array.from(h).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe(DOMAIN_HASH_KAT_HEX);
  });
});

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

  it('rejects a secret that is not exactly 48 bytes, even if its numeric value is in range', () => {
    // A 32-byte (P-256-sized) scalar must be rejected outright — this project
    // bans P-256 entirely, and a value that happens to land in [1, n) should
    // not slip through just because the length check was missing.
    expect(() => secretFromBytes(new Uint8Array(32).fill(1))).toThrow();
    expect(() => secretFromBytes(new Uint8Array(47).fill(1))).toThrow();
    expect(() => secretFromBytes(new Uint8Array(49).fill(1))).toThrow();
  });
});
