import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '@noble/hashes/utils';
import { generateKeyPair, getPublicKey, signMessage, verifyMessage } from '../src/ecdsa';

describe('ecdsa P-384', () => {
  it('sign/verify roundtrip succeeds', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const msg = utf8ToBytes('Surat Keterangan Domisili No. 470/12');
    const sig = signMessage(privateKey, msg);
    expect(verifyMessage(publicKey, msg, sig)).toBe(true);
  });

  it('rejects a tampered message (1 byte changed)', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const msg = utf8ToBytes('amount: 1000000');
    const sig = signMessage(privateKey, msg);
    const tampered = utf8ToBytes('amount: 9000000');
    expect(verifyMessage(publicKey, tampered, sig)).toBe(false);
  });

  it('rejects a signature from the wrong key', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    const msg = utf8ToBytes('hello');
    const sig = signMessage(a.privateKey, msg);
    expect(verifyMessage(b.publicKey, msg, sig)).toBe(false);
  });

  it('derives a 49-byte compressed public key', () => {
    const { privateKey, publicKey } = generateKeyPair();
    expect(publicKey.length).toBe(49);
    expect(getPublicKey(privateKey)).toEqual(publicKey);
  });
});
