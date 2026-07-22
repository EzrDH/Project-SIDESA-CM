import { describe, it, expect } from 'vitest';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

describe('LoggingNotificationSender', () => {
  it('records the send and reports no invalid tokens', async () => {
    const s = new LoggingNotificationSender();
    const res = await s.send(['tok-a', 'tok-b'], { title: 'SIDESA-CM', body: 'Ada pembaruan.', data: { type: 'letter.signed', refId: 'r1', ts: '1' } });
    expect(res.invalidTokens).toEqual([]);
    expect(s.sent).toHaveLength(1);
    expect(s.sent[0].tokens).toEqual(['tok-a', 'tok-b']);
    expect(s.sent[0].message.data.type).toBe('letter.signed');
  });
});
