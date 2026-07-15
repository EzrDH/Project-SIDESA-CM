import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { verifyMessage } from '@sidesa/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { buildRegistryTree, rootHex, hexToBytes, bytesToHex, RegistryEntry } from './registry.builder';

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeEntries(): Promise<{ id: string; leafIndex: number; entry: RegistryEntry }[]> {
    const rows = await this.prisma.account.findMany({
      where: { role: 'WARGA', status: 'ACTIVE', leafIndex: { not: null } },
      orderBy: { leafIndex: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      leafIndex: r.leafIndex as number,
      entry: { publicKey: r.publicKey, attributes: r.attributes ?? '' },
    }));
  }

  async approveWarga(wargaAccountId: string, attributes: string): Promise<{ leafIndex: number }> {
    const acc = await this.prisma.account.findUnique({ where: { id: wargaAccountId } });
    if (!acc || acc.role !== 'WARGA') throw new NotFoundException('Warga tidak ditemukan.');
    const count = await this.prisma.account.count({ where: { role: 'WARGA', leafIndex: { not: null } } });
    const leafIndex = acc.leafIndex ?? count;
    await this.prisma.account.update({
      where: { id: wargaAccountId },
      data: { attributes, status: 'ACTIVE', leafIndex },
    });
    return { leafIndex };
  }

  async snapshotRoot(): Promise<{ version: number; root: string }> {
    const entries = (await this.activeEntries()).map((e) => e.entry);
    if (entries.length === 0) throw new BadRequestException('Registri penduduk masih kosong.');
    const root = rootHex(buildRegistryTree(entries));
    const v = await this.prisma.registryVersion.create({ data: { root, active: false } });
    return { version: v.version, root };
  }

  async publishSignedRoot(
    kadesAccountId: string,
    version: number,
    signatureHex: string,
  ): Promise<{ active: boolean }> {
    const kades = await this.prisma.account.findUnique({ where: { id: kadesAccountId } });
    if (!kades || kades.role !== 'KADES' || kades.status !== 'ACTIVE') {
      throw new BadRequestException('Hanya Kepala Desa aktif yang boleh menandatangani root.');
    }
    const ver = await this.prisma.registryVersion.findUnique({ where: { version } });
    if (!ver) throw new NotFoundException('Versi registri tidak ditemukan.');
    const ok = verifyMessage(hexToBytes(kades.publicKey), hexToBytes(ver.root), hexToBytes(signatureHex));
    if (!ok) throw new BadRequestException('Tanda tangan root tidak valid.');
    await this.prisma.registryVersion.updateMany({ where: { active: true }, data: { active: false } });
    await this.prisma.registryVersion.update({
      where: { version },
      data: { active: true, signature: signatureHex, signedBy: kades.publicKey },
    });
    return { active: true };
  }

  async activeRootHex(): Promise<string | null> {
    const v = await this.prisma.registryVersion.findFirst({
      where: { active: true },
      orderBy: { version: 'desc' },
    });
    return v?.root ?? null;
  }

  async proofForAccount(accountId: string) {
    const entries = await this.activeEntries();
    const idx = entries.findIndex((e) => e.id === accountId);
    if (idx < 0) throw new NotFoundException('Akun belum terdaftar di registri aktif.');
    const tree = buildRegistryTree(entries.map((e) => e.entry));
    const proof = tree.getProof(idx);
    return {
      attributes: entries[idx].entry.attributes,
      leafIndex: entries[idx].leafIndex,
      root: rootHex(tree),
      merkleProof: proof.map((s) => ({ sibling: bytesToHex(s.sibling), isRight: s.isRight })),
    };
  }
}
