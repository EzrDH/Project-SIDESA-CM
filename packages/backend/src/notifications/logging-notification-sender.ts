import { Logger } from '@nestjs/common';
import { NotificationMessage, NotificationSender, SendResult } from './notification-sender';

/** Default sender: records intent, sends nothing. Used in dev and all tests. */
export class LoggingNotificationSender extends NotificationSender {
  private readonly logger = new Logger('Notifications');
  readonly sent: { tokens: string[]; message: NotificationMessage }[] = [];

  async send(tokens: string[], message: NotificationMessage): Promise<SendResult> {
    this.sent.push({ tokens, message });
    this.logger.log(`notify type=${message.data.type} refId=${message.data.refId} tokens=${tokens.length} (log driver)`);
    return { invalidTokens: [] };
  }
}
