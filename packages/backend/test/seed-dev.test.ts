import { describe, it } from 'vitest';
import { generateKeyPair } from '@sidesa/crypto';
import { PrismaService } from '../src/prisma/prisma.service';

// Dev seed — creates fixed ACTIVE accounts and prints login credentials.
// Skipped in the normal suite; run on demand:  SEED=1 npx vitest run test/seed-dev.test.ts
const RUN = process.env.SEED === '1';
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

(RUN ? describe : describe.skip)('seed dev accounts', () => {
  it('creates ACTIVE warga/operator/kades and prints credentials', async () => {
    const prisma = new PrismaService();
    await prisma.$connect();

    const specs: { role: 'WARGA' | 'OPERATOR' | 'KADES'; name: string; nik?: string }[] = [
      { role: 'WARGA', name: 'Budi (dev)', nik: 'dev-commit' },
      { role: 'OPERATOR', name: 'Operator (dev)' },
      { role: 'KADES', name: 'Kepala Desa (dev)' },
    ];

    // eslint-disable-next-line no-console
    console.log('\n===== SEED DEV ACCOUNTS =====');
    for (const s of specs) {
      await prisma.authChallenge.deleteMany({ where: { account: { displayName: s.name } } });
      await prisma.account.deleteMany({ where: { displayName: s.name } });
      const kp = generateKeyPair();
      const acc = await prisma.account.create({
        data: { role: s.role, status: 'ACTIVE', publicKey: hex(kp.publicKey), displayName: s.name, nikCommitment: s.nik ?? null },
      });
      // eslint-disable-next-line no-console
      console.log(`[${s.role}]`);
      // eslint-disable-next-line no-console
      console.log(`  SIDESA_ACCOUNT=${acc.id}`);
      // eslint-disable-next-line no-console
      console.log(`  SIDESA_PRIVKEY=${hex(kp.privateKey)}`);
    }
    // eslint-disable-next-line no-console
    console.log('=============================\n');
    await prisma.$disconnect();
  });
});
