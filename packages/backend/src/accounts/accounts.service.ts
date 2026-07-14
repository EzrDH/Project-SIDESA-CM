import { ConflictException, Injectable } from '@nestjs/common';

export type Role = 'ADMIN' | 'KADES' | 'OPERATOR' | 'WARGA';
export type Status = 'ACTIVE' | 'PENDING' | 'REVOKED';

export interface Account {
  id: string;
  role: Role;
  status: Status;
  publicKey: string;
  displayName: string;
  nikCommitment?: string | null;
  createdAt: Date;
}

export interface AccountRepo {
  findByPublicKey(publicKey: string): Promise<Account | null>;
  create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountRepo) {}

  private async ensureNewKey(publicKey: string) {
    if (await this.repo.findByPublicKey(publicKey)) {
      throw new ConflictException('Kunci publik ini sudah terdaftar.');
    }
  }

  async provisionPrivileged(input: {
    role: 'OPERATOR' | 'KADES';
    publicKey: string;
    displayName: string;
  }): Promise<Account> {
    await this.ensureNewKey(input.publicKey);
    return this.repo.create({
      role: input.role,
      status: 'ACTIVE',
      publicKey: input.publicKey,
      displayName: input.displayName,
      nikCommitment: null,
    });
  }

  async selfRegisterWarga(input: {
    publicKey: string;
    displayName: string;
    nikCommitment: string;
  }): Promise<Account> {
    await this.ensureNewKey(input.publicKey);
    return this.repo.create({
      role: 'WARGA',
      status: 'PENDING',
      publicKey: input.publicKey,
      displayName: input.displayName,
      nikCommitment: input.nikCommitment,
    });
  }
}
