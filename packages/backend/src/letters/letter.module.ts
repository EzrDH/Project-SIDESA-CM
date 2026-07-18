import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LetterService } from './letter.service';
import { VerificationService } from './verification.service';
import { LetterController } from './letter.controller';
import { VerificationController } from './verification.controller';
import { RegistryModule } from '../registry/registry.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' }),
    RegistryModule,
  ],
  controllers: [LetterController, VerificationController],
  providers: [PrismaService, LetterService, VerificationService],
})
export class LetterModule {}
