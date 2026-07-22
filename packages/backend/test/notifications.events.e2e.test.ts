import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair } from '@sidesa/crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { LetterService } from '../src/letters/letter.service';
import { NOTIFICATION_SENDER } from '../src/notifications/notification-sender';
import { LoggingNotificationSender } from '../src/notifications/logging-notification-sender';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

describe('Domain events trigger notifications (e2e, needs Postgres)', () => {
  let app: INestApplication; let prisma: PrismaService; let letters: LetterService; let sender: LoggingNotificationSender;
  const warga = generateKeyPair(); const wpk = hex(warga.publicKey); let wargaId = '';

  beforeAll(async () => {
    // Force the logging sender so we can capture sends, overriding the module default.
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NOTIFICATION_SENDER).useValue(new LoggingNotificationSender())
      .compile();
    app = mod.createNestApplication(); await app.init();
    prisma = app.get(PrismaService); letters = app.get(LetterService);
    sender = app.get(NOTIFICATION_SENDER) as LoggingNotificationSender;
    wargaId = (await prisma.account.create({ data: { role: 'WARGA', status: 'ACTIVE', publicKey: wpk, displayName: 'W' } })).id;
    await prisma.deviceToken.create({ data: { accountId: wargaId, token: 'tok-w-evt', platform: 'android' } });
  });
  afterAll(async () => {
    await prisma.letter.deleteMany({ where: { request: { wargaAccountId: wargaId } } });
    await prisma.letterRequest.deleteMany({ where: { wargaAccountId: wargaId } });
    await prisma.deviceToken.deleteMany({ where: { accountId: wargaId } });
    await prisma.account.deleteMany({ where: { id: wargaId } });
    await app.close();
  });

  it('emits letter.rejected -> warga owner receives a send', async () => {
    const req = await prisma.letterRequest.create({ data: { wargaAccountId: wargaId, type: 'DOMISILI', formData: '{}' } });
    sender.sent.length = 0;
    await letters.reject(req.id);
    // event handling is async; allow the microtask/emitter to flush
    await new Promise((r) => setTimeout(r, 50));
    expect(sender.sent.some((s) => s.message.data.type === 'letter.rejected' && s.tokens.includes('tok-w-evt'))).toBe(true);
  });
});
