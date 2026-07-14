import { describe, it, expect } from 'vitest';
import { AccountsService, AccountRepo } from '../src/accounts/accounts.service';

function makeRepo(): AccountRepo {
  const rows: any[] = [];
  return {
    async findByPublicKey(pk) { return rows.find((r) => r.publicKey === pk) ?? null; },
    async create(data) { const row = { id: `id-${rows.length}`, createdAt: new Date(), ...data }; rows.push(row); return row; },
  };
}

describe('AccountsService provisioning', () => {
  it('provisions an operator as ACTIVE', async () => {
    const svc = new AccountsService(makeRepo());
    const acc = await svc.provisionPrivileged({ role: 'OPERATOR', publicKey: 'pk-op', displayName: 'Kaur Umum' });
    expect(acc.role).toBe('OPERATOR');
    expect(acc.status).toBe('ACTIVE');
  });

  it('self-registers a warga as PENDING with a nik commitment (never raw NIK)', async () => {
    const svc = new AccountsService(makeRepo());
    const acc = await svc.selfRegisterWarga({ publicKey: 'pk-w', displayName: 'Budi', nikCommitment: 'abc123' });
    expect(acc.role).toBe('WARGA');
    expect(acc.status).toBe('PENDING');
    expect(acc.nikCommitment).toBe('abc123');
  });

  it('rejects a duplicate public key', async () => {
    const repo = makeRepo();
    const svc = new AccountsService(repo);
    await svc.provisionPrivileged({ role: 'KADES', publicKey: 'dup', displayName: 'Kepala Desa' });
    await expect(
      svc.selfRegisterWarga({ publicKey: 'dup', displayName: 'X', nikCommitment: 'z' }),
    ).rejects.toThrow();
  });
});
