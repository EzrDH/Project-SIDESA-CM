import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { BookingService } from './booking.service';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  create(@Req() req: any, @Body() body: { purpose: string; requestedSlot: string }) {
    return this.bookings.create(req.user.accountId, body.purpose, body.requestedSlot);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  mine(@Req() req: any) {
    return this.bookings.listForWarga(req.user.accountId);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR', 'KADES')
  queue() {
    return this.bookings.listQueue();
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  confirm(@Param('id') id: string, @Body() body: { slot?: string }) {
    return this.bookings.confirm(id, body?.slot);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR', 'KADES')
  cancel(@Param('id') id: string) {
    return this.bookings.cancel(id);
  }

  @Post('checkin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  checkin(@Body() body: { token: string }) {
    return this.bookings.checkin(body.token);
  }
}
