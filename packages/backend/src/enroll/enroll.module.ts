import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollService } from './enroll.service';
import { EnrollController } from './enroll.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' }), AuditModule],
  controllers: [EnrollController],
  providers: [PrismaService, EnrollService],
  exports: [EnrollService],
})
export class EnrollModule {}
