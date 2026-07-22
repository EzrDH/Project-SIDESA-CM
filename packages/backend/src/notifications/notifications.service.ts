import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_SENDER, NotificationMessage, NotificationSender } from './notification-sender';
import { DomainEvent, NotificationType } from './notification-events';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  async registerToken(accountId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { accountId, platform },
      create: { accountId, token, platform },
    });
  }

  async unregisterToken(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  // generic, PII-free copy per audience
  private message(event: DomainEvent): NotificationMessage {
    const forOfficer = event.type === 'letter.submitted' || event.type === 'booking.requested';
    const body = forOfficer ? 'Ada permohonan baru menunggu.' : 'Ada pembaruan pada permohonan Anda.';
    return { title: 'SIDESA-CM', body, data: { type: event.type, refId: event.refId, ts: Date.now().toString() } };
  }

  private async recipientIds(event: DomainEvent): Promise<string[]> {
    const officers = async (role: 'OPERATOR' | 'KADES') =>
      (await this.prisma.account.findMany({ where: { role, status: 'ACTIVE' }, select: { id: true } })).map((a) => a.id);
    switch (event.type) {
      case 'letter.submitted':
      case 'booking.requested':
        return officers('OPERATOR');
      case 'letter.drafted':
        return [...(event.wargaAccountId ? [event.wargaAccountId] : []), ...(await officers('KADES'))];
      default: // letter.signed | letter.rejected | booking.confirmed | booking.cancelled
        return event.wargaAccountId ? [event.wargaAccountId] : [];
    }
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const accountIds = await this.recipientIds(event);
    if (accountIds.length === 0) return;
    const tokenRows = await this.prisma.deviceToken.findMany({ where: { accountId: { in: accountIds } }, select: { token: true } });
    const tokens = tokenRows.map((t) => t.token);
    if (tokens.length === 0) return;
    const { invalidTokens } = await this.sender.send(tokens, this.message(event));
    if (invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }
}
