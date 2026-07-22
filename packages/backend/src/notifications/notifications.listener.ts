import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { DomainEvent } from './notification-events';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger('Notifications');
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent('letter.*')
  @OnEvent('booking.*')
  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.notifications.dispatch(event);
    } catch (err) {
      // Notifications are best-effort: a failure here must never affect the
      // letter/booking transaction that already committed.
      this.logger.error(`notification dispatch failed for ${event.type} ${event.refId}: ${err}`);
    }
  }
}
