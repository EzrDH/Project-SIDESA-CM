import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

const pk = (s: string) => '02' + s.padEnd(96, '0'); // dummy 49-byte-ish compressed hex, unique per test

describe('NotificationsService.dispatch (needs Postgres)', () => {
  const prisma = new PrismaService();
  const sender = new LoggingNotificationSender();
  const svc = new NotificationsService(prisma, sender);
  let warga = '', operator = '', kades = '';

  beforeAll(async () => {
    await prisma.$connect();
    warga = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: pk('warga-notif'), displayName: 'W' } })).id;
    operator = (await prisma.account.create({ data: { role: 'OPERATOR', status: 'ACTIVE', publicKey: pk('op-notif'), displayName: 'O' } })).id;
    kades = (await prisma.account.create({ data: { role: 'KADES', status: 'ACTIVE', publicKey: pk('kades-notif'), displayName: 'K' } })).id;
    await svc.registerToken(warga, 'tok-warga', 'android');
    await svc.registerToken(operator, 'tok-op', 'android');
    await svc.registerToken(kades, 'tok-kades', 'android');
  });
  afterAll(async () => {
    const ids = [warga, operator, kades];
    await prisma.deviceToken.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('routes letter.signed only to the warga owner with a PII-free payload', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.signed', refId: 'req-1', wargaAccountId: warga });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].tokens).toEqual(['tok-warga']);
    const m = sender.sent[0].message;
    expect(m.data).toEqual({ type: 'letter.signed', refId: 'req-1', ts: expect.any(String) });
    // privacy: nothing but the generic strings
    expect(JSON.stringify(m)).not.toContain(warga);
    expect(m.body).not.toMatch(/\d{6,}/); // no long numbers / NIK / letter numbers
  });

  it('routes letter.submitted to every ACTIVE operator', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.submitted', refId: 'req-2' });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].tokens).toEqual(['tok-op']);
  });

  it('routes letter.drafted to the warga owner and every ACTIVE kades', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'letter.drafted', refId: 'req-3', wargaAccountId: warga });
    const tokens = sender.sent[0].tokens.sort();
    expect(tokens).toEqual(['tok-kades', 'tok-warga']);
  });

  it('does not send and does not throw when there are no tokens', async () => {
    sender.sent.length = 0;
    await svc.dispatch({ type: 'booking.confirmed', refId: 'b-1', wargaAccountId: 'nobody' });
    expect(sender.sent).toHaveLength(0);
  });
});
