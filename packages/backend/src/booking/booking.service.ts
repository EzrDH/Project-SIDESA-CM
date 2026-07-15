import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function randomToken(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(wargaAccountId: string, purpose: string, requestedSlotIso: string) {
    const checkinToken = randomToken();
    const b = await this.prisma.booking.create({
      data: { wargaAccountId, purpose, requestedSlot: new Date(requestedSlotIso), checkinToken },
    });
    return { id: b.id, checkinToken };
  }

  listForWarga(wargaAccountId: string) {
    return this.prisma.booking.findMany({ where: { wargaAccountId }, orderBy: { requestedSlot: 'asc' } });
  }

  listQueue() {
    return this.prisma.booking.findMany({ where: { status: 'REQUESTED' }, orderBy: { requestedSlot: 'asc' } });
  }

  async confirm(bookingId: string, slotIso?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Janji temu tidak ditemukan.');
    const slot = slotIso ? new Date(slotIso) : booking.requestedSlot;
    const clash = await this.prisma.booking.count({
      where: { confirmedSlot: slot, status: { in: ['CONFIRMED', 'CHECKED_IN'] }, NOT: { id: bookingId } },
    });
    if (clash > 0) throw new BadRequestException('Slot waktu itu sudah terisi.');
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', confirmedSlot: slot },
    });
    return { status: updated.status, confirmedSlot: updated.confirmedSlot! };
  }

  async cancel(bookingId: string) {
    const updated = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
    return { status: updated.status };
  }

  async checkin(token: string) {
    const booking = await this.prisma.booking.findUnique({ where: { checkinToken: token } });
    if (!booking) throw new NotFoundException('Janji temu tidak ditemukan.');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Janji temu belum dikonfirmasi.');
    const updated = await this.prisma.booking.update({ where: { checkinToken: token }, data: { status: 'CHECKED_IN' } });
    return { status: updated.status };
  }
}
