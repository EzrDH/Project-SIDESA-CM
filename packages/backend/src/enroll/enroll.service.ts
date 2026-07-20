import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { domainHash, verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hexToBytes } from '../registry/registry.builder';
import { buildEnrollMessage, normalizeCode } from './enroll.message';

const enc = new TextEncoder();
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/// No 0/O/1/I/L — codes get read aloud and typed by hand at the village office.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;
const TTL_MS = 30 * 60 * 1000;

function randomCode(): string {
  const limit = 256 - (256 % ALPHABET.length); // reject above this to avoid modulo bias
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < CODE_LEN) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] >= limit) continue;
    out.push(ALPHABET[buf[0] % ALPHABET.length]);
  }
  return out.join('');
}

@Injectable()
export class EnrollService {
  constructor(private readonly prisma: PrismaService) {}

  /// Codes are stored hashed: a database leak must not yield usable codes.
  private hashCode(code: string): string {
    return bytesToHex(domainHash('SIDESA-enroll-code-v1', enc.encode(normalizeCode(code))));
  }

  /// Issued by an operator who has just verified the resident's KTP in person.
  /// The verified identity travels with the code, so the device never asserts it.
  async issueCode(
    operatorId: string,
    input: { displayName: string; nikCommitment: string; attributes: string },
  ): Promise<{ code: string; expiresAt: Date }> {
    const code = randomCode();
    const expiresAt = new Date(Date.now() + TTL_MS);
    await this.prisma.enrollmentCode.create({
      data: {
        codeHash: this.hashCode(code),
        displayName: input.displayName,
        nikCommitment: input.nikCommitment,
        attributes: input.attributes,
        expiresAt,
        issuedBy: operatorId,
      },
    });
    // Shown to the operator once, in a shape that is easy to read out loud.
    return { code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt };
  }

  /// Bind a device's public key to the identity the operator vouched for.
  /// Every failure returns the same message so the endpoint cannot be used to
  /// probe which codes exist.
  async claim(
    code: string,
    publicKey: string,
    signatureHex: string,
  ): Promise<{ accountId: string; role: string; displayName: string }> {
    const invalid = () => new BadRequestException('Kode enrolmen tidak valid atau kedaluwarsa.');
    const rec = await this.prisma.enrollmentCode.findUnique({ where: { codeHash: this.hashCode(code) } });
    if (!rec || rec.used || rec.expiresAt.getTime() < Date.now()) throw invalid();

    // Proof of possession: the caller must hold the private key for this public key.
    let ok = false;
    try {
      ok = verifyMessage(hexToBytes(publicKey), buildEnrollMessage(code, publicKey), hexToBytes(signatureHex));
    } catch {
      ok = false;
    }
    if (!ok) throw invalid();

    if (await this.prisma.account.findUnique({ where: { publicKey } })) {
      throw new ConflictException('Kunci publik ini sudah terdaftar.');
    }

    // Create the account and burn the code together, so a race cannot yield two
    // accounts from one code.
    const account = await this.prisma.$transaction(async (tx) => {
      const burned = await tx.enrollmentCode.updateMany({
        where: { codeHash: rec.codeHash, used: false },
        data: { used: true },
      });
      if (burned.count !== 1) throw invalid();
      const acc = await tx.account.create({
        data: {
          role: 'WARGA',
          status: 'ACTIVE',
          publicKey,
          displayName: rec.displayName,
          nikCommitment: rec.nikCommitment,
          attributes: rec.attributes,
        },
      });
      await tx.enrollmentCode.update({ where: { codeHash: rec.codeHash }, data: { accountId: acc.id } });
      return acc;
    });

    return { accountId: account.id, role: account.role, displayName: account.displayName };
  }
}
