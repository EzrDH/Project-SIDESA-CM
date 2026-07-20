import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';
import { LetterModule } from './letters/letter.module';
import { BookingModule } from './booking/booking.module';
import { AuditModule } from './audit/audit.module';
import { EnrollModule } from './enroll/enroll.module';

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
    EnrollModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Reject malformed bodies early and strip unknown properties. Endpoints whose
    // body is typed as a DTO class are validated; the rest pass through unchanged.
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) },
  ],
})
export class AppModule {}
