import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';
import { LetterModule } from './letters/letter.module';
import { BookingModule } from './booking/booking.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Basic per-IP rate limit (120 req/min) to blunt brute-force + abuse.
    // Inert under vitest so the test suite isn't throttled.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => !!process.env.VITEST,
    }),
    AuthModule,
    RegistryModule,
    LetterModule,
    BookingModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
