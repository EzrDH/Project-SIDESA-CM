import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from './registry.service';
import { EligibilityService } from './eligibility.service';
import { RegistryController } from './registry.controller';
import { EligibilityController } from './eligibility.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [RegistryController, EligibilityController],
  providers: [PrismaService, RegistryService, EligibilityService],
  exports: [RegistryService, EligibilityService],
})
export class RegistryModule {}
