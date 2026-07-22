import { describe, it, expect } from 'vitest';
import { selectNotificationSender } from '../src/notifications/notifications.module';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';
import { FcmNotificationSender } from '../src/notifications/fcm-notification-sender';

describe('selectNotificationSender', () => {
  it('returns the logging sender when driver is unset or "log"', () => {
    expect(selectNotificationSender(undefined)).toBeInstanceOf(LoggingNotificationSender);
    expect(selectNotificationSender('log')).toBeInstanceOf(LoggingNotificationSender);
  });
  it('returns the FCM sender when driver is "fcm"', () => {
    expect(selectNotificationSender('fcm')).toBeInstanceOf(FcmNotificationSender);
  });
});
