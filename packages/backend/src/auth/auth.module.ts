import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsService } from '../accounts/accounts.service';
import { AccountsController } from '../accounts/accounts.controller';
import { PrismaChallengeStore, PrismaAccountLookup, PrismaAccountRepo } from './prisma-adapters';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [AuthController, AccountsController],
  providers: [
    PrismaService,
    PrismaChallengeStore,
    PrismaAccountLookup,
    PrismaAccountRepo,
    {
      provide: AuthService,
      useFactory: (c: PrismaChallengeStore, a: PrismaAccountLookup) => new AuthService(c, a),
      inject: [PrismaChallengeStore, PrismaAccountLookup],
    },
    {
      provide: AccountsService,
      useFactory: (r: PrismaAccountRepo) => new AccountsService(r),
      inject: [PrismaAccountRepo],
    },
  ],
})
export class AuthModule {}
