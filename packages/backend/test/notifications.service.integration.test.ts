import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

describe('NotificationsService token registration (needs Postgres)', () => {
  const prisma = new PrismaService();
  const svc = new NotificationsService(prisma, new LoggingNotificationSender());
  const acc = 'acc-notif-reg';
  beforeAll(async () => { await prisma.$connect(); await prisma.deviceToken.deleteMany({ where: { accountId: acc } }); });
  afterAll(async () => { await prisma.deviceToken.deleteMany({ where: { accountId: acc } }); await prisma.$disconnect(); });

  it('registers, re-registers idempotently, and unregisters', async () => {
    await svc.registerToken(acc, 'tok-x', 'android');
    await svc.registerToken(acc, 'tok-x', 'android'); // upsert, still one row
    let rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(1);

    await svc.unregisterToken('tok-x', acc);
    rows = await prisma.deviceToken.findMany({ where: { accountId: acc } });
    expect(rows).toHaveLength(0);

    await svc.unregisterToken('tok-missing', acc); // no throw when absent
  });
});
