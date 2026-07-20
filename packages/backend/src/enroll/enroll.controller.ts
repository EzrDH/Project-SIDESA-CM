import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { EnrollService } from './enroll.service';
import { AuditService } from '../audit/audit.service';
import { IssueCodeDto, ClaimCodeDto } from './enroll.dto';

@Controller('enroll')
export class EnrollController {
  constructor(
    private readonly enroll: EnrollService,
    private readonly audit: AuditService,
  ) {}

  @Post('code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR', 'ADMIN')
  async issue(@Req() req: any, @Body() body: IssueCodeDto) {
    const res = await this.enroll.issueCode(req.user.accountId, body);
    await this.audit.record(req.user.accountId, 'ENROLL_ISSUE', body.nikCommitment, {
      displayName: body.displayName,
      expiresAt: res.expiresAt.toISOString(),
    });
    return res;
  }

  // Unauthenticated by design — the code is the credential. Tightly throttled so
  // the 8-character code space cannot be searched.
  @Post('claim')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async claim(@Body() body: ClaimCodeDto) {
    const res = await this.enroll.claim(body.code, body.publicKey, body.signature);
    await this.audit.record(res.accountId, 'ENROLL_CLAIM', res.accountId, { displayName: res.displayName });
    return res;
  }
}
