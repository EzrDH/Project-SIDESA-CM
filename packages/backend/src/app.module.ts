import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';
import { LetterModule } from './letters/letter.module';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [AuthModule, RegistryModule, LetterModule, BookingModule],
  controllers: [HealthController],
})
export class AppModule {}
