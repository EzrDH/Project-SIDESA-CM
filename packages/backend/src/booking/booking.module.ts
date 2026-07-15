import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [BookingController],
  providers: [PrismaService, BookingService],
})
export class BookingModule {}
