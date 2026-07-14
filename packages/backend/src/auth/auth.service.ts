import { verifyMessage } from '@sidesa/crypto';
import { buildAuthMessage } from './auth.message';

export type Role = 'ADMIN' | 'KADES' | 'OPERATOR' | 'WARGA';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface ChallengeStore {
  save(accountId: string, nonce: string, expiresAt: number): Promise<void>;
  find(nonce: string): Promise<{ accountId: string; used: boolean; expiresAt: number } | null>;
  markUsed(nonce: string): Promise<void>;
}
export interface AccountLookup {
  get(id: string): Promise<{ id: string; role: Role; status: string; publicKey: string } | null>;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function randomNonce(): string {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export class AuthService {
  constructor(private readonly challenges: ChallengeStore, private readonly accounts: AccountLookup) {}

  async createChallenge(accountId: string): Promise<{ nonce: string }> {
    const nonce = randomNonce();
    await this.challenges.save(accountId, nonce, Date.now() + CHALLENGE_TTL_MS);
    return { nonce };
  }

  async verifyResponse(
    accountId: string,
    nonce: string,
    signatureHex: string,
  ): Promise<{ ok: boolean; role?: Role }> {
    const challenge = await this.challenges.find(nonce);
    if (!challenge || challenge.used || challenge.accountId !== accountId) return { ok: false };
    if (challenge.expiresAt < Date.now()) return { ok: false };

    const account = await this.accounts.get(accountId);
    if (!account || account.status !== 'ACTIVE') return { ok: false };

    const ok = verifyMessage(
      hexToBytes(account.publicKey),
      buildAuthMessage(accountId, nonce),
      hexToBytes(signatureHex),
    );
    if (!ok) return { ok: false };

    await this.challenges.markUsed(nonce);
    return { ok: true, role: account.role };
  }
}
