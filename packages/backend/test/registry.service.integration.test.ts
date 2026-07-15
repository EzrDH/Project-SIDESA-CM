import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';
import { hexToBytes } from '../src/registry/registry.builder';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('RegistryService (integration)', () => {
  const prisma = new PrismaService();
  const svc = new RegistryService(prisma);
  const kades = generateKeyPair();
  const warga = generateKeyPair();
  const kadesPk = hex(kades.publicKey);
  const wargaPk = hex(warga.publicKey);
  let wargaId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.account.deleteMany({ where: { publicKey: { in: [kadesPk, wargaPk] } } });
    await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: kadesPk, displayName: 'KaDes' } });
    const w = await prisma.account.create({ data: { role: 'WARGA', status: 'PENDING', publicKey: wargaPk, displayName: 'Budi', nikCommitment: 'c' } });
    wargaId = w.id;
  });
  afterAll(async () => {
    await prisma.registryVersion.deleteMany({ where: { signedBy: kadesPk } });
    await prisma.account.deleteMany({ where: { publicKey: { in: [kadesPk, wargaPk] } } });
    await prisma.$disconnect();
  });

  it('approves a warga, snapshots a root, and publishes it with a valid KaDes signature', async () => {
    await svc.approveWarga(wargaId, 'rt=001;domisili=CibeteungMuara');
    const activated = await prisma.account.findUnique({ where: { id: wargaId } });
    expect(activated?.status).toBe('ACTIVE');
    expect(activated?.leafIndex).not.toBeNull();

    const snap = await svc.snapshotRoot();
    expect(snap.root).toMatch(/^[0-9a-f]{96}$/);

    const sig = hex(signMessage(kades.privateKey, hexToBytes(snap.root)));
    const kadesAcc = await prisma.account.findUnique({ where: { publicKey: kadesPk } });
    const res = await svc.publishSignedRoot(kadesAcc!.id, snap.version, sig);
    expect(res.active).toBe(true);
    expect(await svc.activeRootHex()).toBe(snap.root);
  });

  it('rejects a root signature that is not from the KaDes key', async () => {
    const snap = await svc.snapshotRoot();
    const wrong = generateKeyPair();
    const badSig = hex(signMessage(wrong.privateKey, hexToBytes(snap.root)));
    const kadesAcc = await prisma.account.findUnique({ where: { publicKey: kadesPk } });
    await expect(svc.publishSignedRoot(kadesAcc!.id, snap.version, badSig)).rejects.toThrow();
  });

  it('returns a warga proof for the active root', async () => {
    const p = await svc.proofForAccount(wargaId);
    expect(p.attributes).toBe('rt=001;domisili=CibeteungMuara');
    expect(Array.isArray(p.merkleProof)).toBe(true);
    expect(p.root).toMatch(/^[0-9a-f]{96}$/);
  });
});
