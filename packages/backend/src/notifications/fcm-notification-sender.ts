import { Logger } from '@nestjs/common';
import { NotificationMessage, NotificationSender, SendResult } from './notification-sender';

/** Real sender. Lazily initialises firebase-admin so importing it needs no creds. */
export class FcmNotificationSender extends NotificationSender {
  private readonly logger = new Logger('Notifications');
  private app: unknown;

  private async messaging() {
    const admin = await import('firebase-admin');
    if (!this.app) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
        }),
      });
    }
    return admin.messaging();
  }

  async send(tokens: string[], message: NotificationMessage): Promise<SendResult> {
    if (tokens.length === 0) return { invalidTokens: [] };
    const messaging = await this.messaging();
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
    });
    const invalidTokens: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') invalidTokens.push(tokens[i]);
    });
    this.logger.log(`FCM sent type=${message.data.type} ok=${res.successCount} invalid=${invalidTokens.length}`);
    return { invalidTokens };
  }
}
