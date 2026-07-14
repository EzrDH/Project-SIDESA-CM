import { describe, it, expect } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { AuthService, ChallengeStore, AccountLookup } from '../src/auth/auth.service';
import { buildAuthMessage } from '../src/auth/auth.message';

function hex(b: Uint8Array) { return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); }

function makeService(pubKeyHex: string, status = 'ACTIVE') {
  const challenges = new Map<string, { accountId: string; used: boolean; expiresAt: number }>();
  const store: ChallengeStore = {
    async save(accountId, nonce, expiresAt) { challenges.set(nonce, { accountId, used: false, expiresAt }); },
    async find(nonce) { return challenges.get(nonce) ?? null; },
    async markUsed(nonce) { const c = challenges.get(nonce); if (c) c.used = true; },
  };
  const accounts: AccountLookup = {
    async get(id) { return id === 'acc-1' ? { id, role: 'WARGA', status, publicKey: pubKeyHex } : null; },
  };
  return { svc: new AuthService(store, accounts), store };
}

describe('AuthService challenge-response', () => {
  it('accepts a correctly signed challenge and returns the role', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    const res = await svc.verifyResponse('acc-1', nonce, sig);
    expect(res).toEqual({ ok: true, role: 'WARGA' });
  });

  it('rejects a signature from the wrong key', async () => {
    const kp = generateKeyPair();
    const wrong = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(wrong.privateKey, buildAuthMessage('acc-1', nonce)));
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });

  it('rejects a reused (already-used) challenge', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey));
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    await svc.verifyResponse('acc-1', nonce, sig);
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });

  it('rejects when the account is not ACTIVE', async () => {
    const kp = generateKeyPair();
    const { svc } = makeService(hex(kp.publicKey), 'PENDING');
    const { nonce } = await svc.createChallenge('acc-1');
    const sig = hex(signMessage(kp.privateKey, buildAuthMessage('acc-1', nonce)));
    expect((await svc.verifyResponse('acc-1', nonce, sig)).ok).toBe(false);
  });
});
