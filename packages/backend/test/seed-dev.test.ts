import { describe, it } from 'vitest';
import { generateKeyPair, signMessage } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RegistryService } from '../src/registry/registry.service';
import { hexToBytes } from '../src/registry/registry.builder';

// Dev seed — creates fixed ACTIVE accounts, registers the warga into a
// KaDes-signed registry root, and prints login credentials.
// Skipped in the normal suite; run on demand:  SEED=1 npx vitest run test/seed-dev.test.ts
const RUN = process.env.SEED === '1';
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

(RUN ? describe : describe.skip)('seed dev accounts', () => {
  it('creates ACTIVE warga/operator/kades, publishes a signed registry, prints credentials', async () => {
    const prisma = new PrismaService();
    await prisma.$connect();
    const registry = new RegistryService(prisma);

    const specs: { role: 'WARGA' | 'OPERATOR' | 'KADES'; name: string; nik?: string }[] = [
      { role: 'WARGA', name: 'Budi (dev)', nik: 'dev-commit' },
      { role: 'OPERATOR', name: 'Operator (dev)' },
      { role: 'KADES', name: 'Kepala Desa (dev)' },
    ];

    // Fresh registry state so leaf indices stay collision-free for the demo.
    await prisma.registryVersion.deleteMany({});
    await prisma.account.updateMany({ where: { role: 'WARGA' }, data: { leafIndex: null } });

    const keys: Record<string, { id: string; priv: Uint8Array }> = {};
    for (const s of specs) {
      await prisma.authChallenge.deleteMany({ where: { account: { displayName: s.name } } });
      await prisma.eligibilityChallenge.deleteMany({ where: { account: { displayName: s.name } } });
      await prisma.account.deleteMany({ where: { displayName: s.name } });
      const kp = generateKeyPair();
      const acc = await prisma.account.create({
        data: { role: s.role, status: 'ACTIVE', publicKey: hex(kp.publicKey), displayName: s.name, nikCommitment: s.nik ?? null },
      });
      keys[s.role] = { id: acc.id, priv: kp.privateKey };
    }

    // Register the warga and publish a KaDes-signed registry root.
    await registry.approveWarga(keys.WARGA.id, 'rt=001;domisili=CibeteungMuara');
    const snap = await registry.snapshotRoot();
    const rootSig = hex(signMessage(keys.KADES.priv, hexToBytes(snap.root)));
    await registry.publishSignedRoot(keys.KADES.id, snap.version, rootSig);

    // eslint-disable-next-line no-console
    console.log('\n===== SEED DEV ACCOUNTS =====');
    for (const role of ['WARGA', 'OPERATOR', 'KADES']) {
      // eslint-disable-next-line no-console
      console.log(`[${role}]\n  SIDESA_ACCOUNT=${keys[role].id}\n  SIDESA_PRIVKEY=${hex(keys[role].priv)}`);
    }
    // eslint-disable-next-line no-console
    console.log(`registry version ${snap.version} published (signed root)\n=============================\n`);
    await prisma.$disconnect();
  });
});
