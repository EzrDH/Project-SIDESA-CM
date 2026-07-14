import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { randomScalar, derivePublic, proveKnowledge, verifyKnowledge } from '../src/schnorr';

describe('schnorr non-interactive PoK', () => {
  it('accepts a valid proof under the same context', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const ctx = utf8ToBytes('permohonan#42');
    const proof = proveKnowledge(x, P, ctx);
    expect(verifyKnowledge(P, proof, ctx)).toBe(true);
  });

  it('rejects a proof replayed under a different context', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const proof = proveKnowledge(x, P, utf8ToBytes('permohonan#42'));
    expect(verifyKnowledge(P, proof, utf8ToBytes('permohonan#43'))).toBe(false);
  });

  it('rejects a proof for a different public key (soundness)', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const Pother = derivePublic(randomScalar());
    const ctx = utf8ToBytes('c');
    const proof = proveKnowledge(x, P, ctx);
    expect(verifyKnowledge(Pother, proof, ctx)).toBe(false);
  });

  it('rejects a tampered response s', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const ctx = utf8ToBytes('c');
    const proof = proveKnowledge(x, P, ctx);
    proof.s[proof.s.length - 1] ^= 0x01;
    expect(verifyKnowledge(P, proof, ctx)).toBe(false);
  });

  it('a prover without the secret cannot forge (uses P but not x)', () => {
    const x = randomScalar();
    const P = derivePublic(x);
    const guess = randomScalar(); // attacker's wrong secret
    const ctx = utf8ToBytes('c');
    const forged = proveKnowledge(guess, P, ctx); // claims P but signs with guess
    expect(verifyKnowledge(P, forged, ctx)).toBe(false);
  });
});
