export interface NotificationMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}
export interface SendResult {
  invalidTokens: string[];
}
export abstract class NotificationSender {
  abstract send(tokens: string[], message: NotificationMessage): Promise<SendResult>;
}
export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
