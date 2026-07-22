// Uses the exact guard + accessor from enroll.controller.ts: JwtAuthGuard sets
// req.user = { accountId, role }, read via @Req().
import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto, UnregisterTokenDto } from './notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('token')
  async register(@Req() req: any, @Body() dto: RegisterTokenDto) {
    await this.notifications.registerToken(req.user.accountId, dto.token, dto.platform);
    return { ok: true };
  }

  @Delete('token')
  @HttpCode(200)
  async unregister(@Req() req: any, @Body() dto: UnregisterTokenDto) {
    await this.notifications.unregisterToken(dto.token, req.user.accountId);
    return { ok: true };
  }
}
