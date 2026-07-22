import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { DomainEvent } from './notification-events';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent('letter.*')
  @OnEvent('booking.*')
  async handle(event: DomainEvent): Promise<void> {
    await this.notifications.dispatch(event);
  }
}
