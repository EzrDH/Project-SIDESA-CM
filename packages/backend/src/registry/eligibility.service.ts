import { Injectable } from '@nestjs/common';
import { verifyEligibility } from '@sidesa/crypto';
import { hexToBytes } from './registry.builder';
import { RegistryService } from './registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildEligibilityContext } from './eligibility.context';

export interface EligibilityProofDto {
  publicKey: string;
  attributes: string;
  merkleProof: { sibling: string; isRight: boolean }[];
  ownership: string; // compact ECDSA signature (hex) over the request context
}

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

  async verify(dto: EligibilityProofDto, context: string): Promise<{ valid: boolean }> {
    const rootHexStr = await this.registry.activeRootHex();
    if (!rootHexStr) return { valid: false };
    const proof = {
      publicKey: hexToBytes(dto.publicKey),
      attributes: enc.encode(dto.attributes),
      merkleProof: dto.merkleProof.map((s) => ({ sibling: hexToBytes(s.sibling), isRight: s.isRight })),
      ownership: hexToBytes(dto.ownership),
    };
    const valid = verifyEligibility(proof, hexToBytes(rootHexStr), enc.encode(context));
    return { valid };
  }

  /// Hand a warga a fresh single-use nonce to bind their next eligibility proof to.
  async issueChallenge(accountId: string): Promise<{ nonce: string }> {
    const nonce = randomNonce();
    await this.prisma.eligibilityChallenge.create({
      data: { accountId, nonce, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    });
    return { nonce };
  }

  /// Verify a proof against a single-use nonce for one letter request, then burn
  /// the nonce. The proof must (a) come from an unused, unexpired nonce owned by
  /// this account, (b) reveal the account's own pseudonymous key, and (c) prove
  /// membership + key ownership bound to (account, type, nonce). Returns false on
  /// any failure — never throws — so the caller decides the HTTP response.
  async consumeAndVerify(
    accountId: string,
    type: string,
    proof: EligibilityProofDto,
    nonce: string,
  ): Promise<boolean> {
    const ch = await this.prisma.eligibilityChallenge.findUnique({ where: { nonce } });
    if (!ch || ch.used || ch.accountId !== accountId) return false;
    if (ch.expiresAt.getTime() < Date.now()) return false;

    const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) return false;
    // Bind the revealed pseudonymous key to this authenticated account.
    if (proof.publicKey.toLowerCase() !== acc.publicKey.toLowerCase()) return false;

    const context = buildEligibilityContext(accountId, type, nonce);
    const { valid } = await this.verify(proof, context);
    if (!valid) return false;

    await this.prisma.eligibilityChallenge.update({ where: { nonce }, data: { used: true } });
    return true;
  }
}
