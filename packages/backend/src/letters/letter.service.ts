import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hexToBytes } from '../registry/registry.builder';
import { renderCanonicalLetter, documentHashHex, LetterType } from './letter.template';

const CODE: Record<LetterType, string> = { SURAT_PENGANTAR: 'SP', SKTM: 'SKTM', DOMISILI: 'SKD' };
const enc = new TextEncoder();

function randomToken(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

@Injectable()
export class LetterService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(
    wargaAccountId: string,
    type: LetterType,
    formData: Record<string, string>,
  ): Promise<{ id: string }> {
    const r = await this.prisma.letterRequest.create({
      data: { wargaAccountId, type, formData: JSON.stringify(formData) },
    });
    return { id: r.id };
  }

  async listQueue() {
    const rows = await this.prisma.letterRequest.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, type: r.type, createdAt: r.createdAt }));
  }

  async draft(requestId: string): Promise<{ letterNumber: string; canonicalContent: string; documentHash: string }> {
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Permohonan tidak ditemukan.');
    if (req.status !== 'SUBMITTED') throw new BadRequestException('Permohonan sudah diproses.');
    const type = req.type as LetterType;
    // req.number is an atomic autoincrement assigned at request creation -> no race.
    const letterNumber = `${req.number}/${CODE[type]}/${new Date().getFullYear()}`;
    const canonicalContent = renderCanonicalLetter(type, JSON.parse(req.formData), letterNumber);
    await this.prisma.letterRequest.update({
      where: { id: requestId },
      data: { status: 'DRAFTED', draftContent: canonicalContent, draftNumber: letterNumber },
    });
    return { letterNumber, canonicalContent, documentHash: documentHashHex(canonicalContent) };
  }

  async forSigning(requestId: string): Promise<{ canonicalContent: string; documentHash: string }> {
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req || !req.draftContent) throw new NotFoundException('Draft belum tersedia.');
    return { canonicalContent: req.draftContent, documentHash: documentHashHex(req.draftContent) };
  }

  async sign(
    kadesAccountId: string,
    requestId: string,
    signatureHex: string,
  ): Promise<{ letterNumber: string; qrToken: string }> {
    const kades = await this.prisma.account.findUnique({ where: { id: kadesAccountId } });
    if (!kades || kades.role !== 'KADES' || kades.status !== 'ACTIVE') {
      throw new BadRequestException('Hanya Kepala Desa aktif yang boleh menandatangani.');
    }
    const req = await this.prisma.letterRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== 'DRAFTED' || !req.draftContent || !req.draftNumber) {
      throw new BadRequestException('Draft belum siap ditandatangani.');
    }
    const ok = verifyMessage(hexToBytes(kades.publicKey), enc.encode(req.draftContent), hexToBytes(signatureHex));
    if (!ok) throw new BadRequestException('Tanda tangan surat tidak valid.');

    const qrToken = randomToken();
    await this.prisma.letter.create({
      data: {
        requestId,
        letterNumber: req.draftNumber,
        canonicalContent: req.draftContent,
        documentHash: documentHashHex(req.draftContent),
        signature: signatureHex,
        kadesAccountId,
        kadesPublicKey: kades.publicKey,
        qrToken,
      },
    });
    await this.prisma.letterRequest.update({ where: { id: requestId }, data: { status: 'SIGNED' } });
    return { letterNumber: req.draftNumber, qrToken };
  }

  async reject(requestId: string): Promise<{ status: string }> {
    await this.prisma.letterRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    return { status: 'REJECTED' };
  }
}
