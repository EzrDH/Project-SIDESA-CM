import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NOTIFICATION_SENDER } from './notification-sender';
import { LoggingNotificationSender } from './logging-notification-sender';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    NotificationsService,
    NotificationsListener,
    { provide: NOTIFICATION_SENDER, useClass: LoggingNotificationSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
