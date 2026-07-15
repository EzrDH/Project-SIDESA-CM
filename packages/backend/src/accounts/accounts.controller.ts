import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return req.user;
  }

  @Post('privileged')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  provision(@Body() body: { role: 'OPERATOR' | 'KADES'; publicKey: string; displayName: string }) {
    return this.accounts.provisionPrivileged(body);
  }

  @Post('register')
  register(@Body() body: { publicKey: string; displayName: string; nikCommitment: string }) {
    return this.accounts.selfRegisterWarga(body);
  }
}
