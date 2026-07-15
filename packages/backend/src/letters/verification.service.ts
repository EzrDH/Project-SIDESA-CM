import { Injectable } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hexToBytes } from '../registry/registry.builder';
import { documentHashHex } from './letter.template';

const enc = new TextEncoder();

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyByToken(token: string) {
    const letter = await this.prisma.letter.findUnique({ where: { qrToken: token }, include: { request: true } });
    if (!letter) return { valid: false };

    const signer = await this.prisma.account.findUnique({ where: { id: letter.kadesAccountId } });
    const signerIsKades = !!signer && signer.role === 'KADES';
    const hashOk = documentHashHex(letter.canonicalContent) === letter.documentHash;
    const sigOk = verifyMessage(
      hexToBytes(letter.kadesPublicKey),
      enc.encode(letter.canonicalContent),
      hexToBytes(letter.signature),
    );

    if (!signerIsKades || !hashOk || !sigOk) return { valid: false };
    return {
      valid: true,
      letterNumber: letter.letterNumber,
      signedAt: letter.signedAt,
      signer: signer!.displayName,
      type: letter.request.type,
      content: letter.canonicalContent,
    };
  }
}
