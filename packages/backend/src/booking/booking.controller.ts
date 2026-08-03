import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { BookingService } from './booking.service';
import { CreateBookingDto, ConfirmBookingDto, CheckinDto } from './booking.dto';
import { EligibilityService } from '../registry/eligibility.service';
import { buildBookingEligibilityContext } from '../registry/eligibility.context';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookings: BookingService,
    private readonly eligibility: EligibilityService,
  ) {}

  /// Hand the warga a single-use nonce to bind their next eligibility proof to.
  @Post('eligibility-challenge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  eligibilityChallenge(@Req() req: any) {
    return this.eligibility.issueChallenge(req.user.accountId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  async create(@Req() req: any, @Body() body: CreateBookingDto) {
    const { accountId } = req.user;
    const context = buildBookingEligibilityContext(accountId, body.eligibility.nonce);
    const ok = await this.eligibility.consumeAndVerify(
      accountId, context, body.eligibility.proof, body.eligibility.nonce,
    );
    if (!ok) throw new ForbiddenException('Bukti kelayakan (ZKP) tidak valid atau kedaluwarsa.');
    return this.bookings.create(accountId, body.purpose, body.requestedSlot);
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
  confirm(@Param('id') id: string, @Body() body: ConfirmBookingDto) {
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
  checkin(@Body() body: CheckinDto) {
    return this.bookings.checkin(body.token);
  }
}
