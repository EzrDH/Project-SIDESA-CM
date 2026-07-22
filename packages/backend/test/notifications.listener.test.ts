import { describe, it, expect } from 'vitest';
import { NotificationsListener } from '../src/notifications/notifications.listener';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('NotificationsListener', () => {
  it('never lets a dispatch rejection escape handle() (best-effort notifications)', async () => {
    const failingService = { dispatch: async () => { throw new Error('boom'); } } as unknown as NotificationsService;
    const listener = new NotificationsListener(failingService);
    await expect(
      listener.handle({ type: 'letter.signed', refId: 'r', wargaAccountId: 'w' }),
    ).resolves.toBeUndefined();
  });
});
