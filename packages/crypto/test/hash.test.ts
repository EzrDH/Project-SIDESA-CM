import { describe, it, expect } from 'vitest';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { hash, hashUtf8, domainHash } from '../src/hash';

describe('hash', () => {
  it('computes the known SHA-384 vector for "abc"', () => {
    // NIST FIPS 180-4 test vector
    expect(bytesToHex(hashUtf8('abc'))).toBe(
      'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7'
    );
  });

  it('hash() and hashUtf8() agree', () => {
    expect(bytesToHex(hash(utf8ToBytes('abc')))).toBe(bytesToHex(hashUtf8('abc')));
  });

  it('domainHash is length-prefixed (no concatenation collisions)', () => {
    const a = domainHash('d', utf8ToBytes('ab'), utf8ToBytes('c'));
    const b = domainHash('d', utf8ToBytes('a'), utf8ToBytes('bc'));
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });

  it('domainHash separates by domain', () => {
    const a = domainHash('domain-1', utf8ToBytes('x'));
    const b = domainHash('domain-2', utf8ToBytes('x'));
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });
});
