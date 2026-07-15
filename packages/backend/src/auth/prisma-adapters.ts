import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengeStore, AccountLookup } from './auth.service';
import { AccountRepo } from '../accounts/accounts.service';

@Injectable()
export class PrismaChallengeStore implements ChallengeStore {
  constructor(private readonly prisma: PrismaService) {}
  async save(accountId: string, nonce: string, expiresAt: number) {
    await this.prisma.authChallenge.create({ data: { accountId, nonce, expiresAt: new Date(expiresAt) } });
  }
  async find(nonce: string) {
    const c = await this.prisma.authChallenge.findUnique({ where: { nonce } });
    return c ? { accountId: c.accountId, used: c.used, expiresAt: c.expiresAt.getTime() } : null;
  }
  async markUsed(nonce: string) {
    await this.prisma.authChallenge.update({ where: { nonce }, data: { used: true } });
  }
}

@Injectable()
export class PrismaAccountLookup implements AccountLookup {
  constructor(private readonly prisma: PrismaService) {}
  async get(id: string) {
    const a = await this.prisma.account.findUnique({ where: { id } });
    return a ? { id: a.id, role: a.role as any, status: a.status, publicKey: a.publicKey } : null;
  }
}

@Injectable()
export class PrismaAccountRepo implements AccountRepo {
  constructor(private readonly prisma: PrismaService) {}
  async findByPublicKey(publicKey: string) {
    return (await this.prisma.account.findUnique({ where: { publicKey } })) as any;
  }
  async create(data: any) {
    return (await this.prisma.account.create({ data })) as any;
  }
}
