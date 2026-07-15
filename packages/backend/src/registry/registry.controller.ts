import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Post('approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  approve(@Body() body: { wargaAccountId: string; attributes: string }) {
    return this.registry.approveWarga(body.wargaAccountId, body.attributes);
  }

  @Post('snapshot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  snapshot() {
    return this.registry.snapshotRoot();
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  publish(@Req() req: any, @Body() body: { version: number; signature: string }) {
    return this.registry.publishSignedRoot(req.user.accountId, body.version, body.signature);
  }

  @Get('proof')
  @UseGuards(JwtAuthGuard)
  proof(@Req() req: any) {
    return this.registry.proofForAccount(req.user.accountId);
  }
}
