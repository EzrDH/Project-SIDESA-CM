import { Injectable } from '@nestjs/common';
import { verifyEligibility } from '@sidesa/crypto';
import { hexToBytes } from './registry.builder';
import { RegistryService } from './registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { EligibilityProofDto } from './eligibility.dto';

export type { EligibilityProofDto };

const enc = new TextEncoder();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function randomNonce(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

@Injectable()
export class EligibilityService {
  constructor(
    private readonly registry: RegistryService,
    private readonly prisma: PrismaService,
  ) {}

  /// Verify a proof against the currently published registry root.
  ///
  /// Returns {valid:false} rather than throwing on any input the verifier
  /// cannot make sense of. The DTO layer already rejects malformed proofs with
  /// a 400, so reaching the guard below means an internal caller bypassed it —
  /// still a rejection, never a 500 that leaks a stack trace to an endpoint
  /// that needs no credentials.
  async verify(dto: EligibilityProofDto, context: string): Promise<{ valid: boolean }> {
    const rootHexStr = await this.registry.activeRootHex();
    if (!rootHexStr) return { valid: false };
    try {
      const proof = {
        publicKey: hexToBytes(dto.publicKey),
        attributes: enc.encode(dto.attributes),
        merkleProof: dto.merkleProof.map((s) => ({ sibling: hexToBytes(s.sibling), isRight: s.isRight })),
        ownership: hexToBytes(dto.ownership),
      };
      return { valid: verifyEligibility(proof, hexToBytes(rootHexStr), enc.encode(context)) };
    } catch {
      return { valid: false };
    }
  }

  /// Hand a warga a fresh single-use nonce to bind their next eligibility proof to.
  async issueChallenge(accountId: string): Promise<{ nonce: string }> {
    const nonce = randomNonce();
    await this.prisma.eligibilityChallenge.create({
      data: { accountId, nonce, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    });
    return { nonce };
  }

  /// Verify a proof against a single-use nonce for one request, then burn the
  /// nonce. The proof must (a) come from an unused, unexpired nonce owned by
  /// this account, (b) reveal the account's own pseudonymous key, and (c) prove
  /// membership + key ownership bound to [context]. Returns false on any
  /// failure — never throws — so the caller decides the HTTP response.
  ///
  /// [context] is built by the caller from the domain helpers in
  /// `eligibility.context.ts`, which is what keeps the booking and letter flows
  /// from accepting each other's proofs. The account and key bindings below are
  /// checked here regardless of what the caller passed.
  async consumeAndVerify(
    accountId: string,
    context: string,
    proof: EligibilityProofDto,
    nonce: string,
  ): Promise<boolean> {
    if (typeof nonce !== 'string' || typeof proof?.publicKey !== 'string') return false;
    const ch = await this.prisma.eligibilityChallenge.findUnique({ where: { nonce } });
    if (!ch || ch.used || ch.accountId !== accountId) return false;
    if (ch.expiresAt.getTime() < Date.now()) return false;

    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) return false;
    // Bind the revealed pseudonymous key to this authenticated account.
    if (proof.publicKey.toLowerCase() !== acc.publicKey.toLowerCase()) return false;

    const { valid } = await this.verify(proof, context);
    if (!valid) return false;

    await this.prisma.eligibilityChallenge.update({ where: { nonce }, data: { used: true } });
    return true;
  }
}
