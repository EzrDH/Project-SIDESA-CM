import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { RegistryModule } from '../registry/registry.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' }),
    RegistryModule, // provides EligibilityService — booking is gated by it
  ],
  controllers: [BookingController],
  providers: [PrismaService, BookingService],
})
export class BookingModule {}
