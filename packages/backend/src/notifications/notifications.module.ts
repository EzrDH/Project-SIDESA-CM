import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NOTIFICATION_SENDER, NotificationSender } from './notification-sender';
import { LoggingNotificationSender } from './logging-notification-sender';
import { FcmNotificationSender } from './fcm-notification-sender';

export function selectNotificationSender(driver: string | undefined): NotificationSender {
  return driver === 'fcm' ? new FcmNotificationSender() : new LoggingNotificationSender();
}

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'test-secret' })],
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    NotificationsService,
    NotificationsListener,
    { provide: NOTIFICATION_SENDER, useFactory: () => selectNotificationSender(process.env.NOTIFICATIONS_DRIVER) },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
