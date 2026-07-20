import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { RegistryService } from './registry.service';
import { AuditService } from '../audit/audit.service';
import { ApproveWargaDto, PublishRootDto } from './registry.dto';

@Controller('registry')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly audit: AuditService,
  ) {}

  @Post('approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  async approve(@Req() req: any, @Body() body: ApproveWargaDto) {
    const res = await this.registry.approveWarga(body.wargaAccountId, body.attributes);
    await this.audit.record(req.user.accountId, 'REGISTRY_APPROVE', body.wargaAccountId, { leafIndex: res.leafIndex });
    return res;
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
  async publish(@Req() req: any, @Body() body: PublishRootDto) {
    const res = await this.registry.publishSignedRoot(req.user.accountId, body.version, body.signature);
    await this.audit.record(req.user.accountId, 'REGISTRY_PUBLISH', `v${body.version}`, { version: body.version });
    return res;
  }

  @Get('proof')
  @UseGuards(JwtAuthGuard)
  proof(@Req() req: any) {
    return this.registry.proofForAccount(req.user.accountId);
  }
}
