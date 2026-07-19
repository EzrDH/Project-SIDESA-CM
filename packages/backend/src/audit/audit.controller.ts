import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES', 'ADMIN')
  verify() {
    return this.audit.verify();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES', 'ADMIN')
  recent() {
    return this.audit.recent();
  }
}
