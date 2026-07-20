import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { LetterService } from './letter.service';
import { EligibilityService } from '../registry/eligibility.service';
import { AuditService } from '../audit/audit.service';
import { RequestLetterDto, SignLetterDto } from './letter.dto';

@Controller('letters')
export class LetterController {
  constructor(
    private readonly letters: LetterService,
    private readonly eligibility: EligibilityService,
    private readonly audit: AuditService,
  ) {}

  @Post('eligibility-challenge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  eligibilityChallenge(@Req() req: any) {
    return this.eligibility.issueChallenge(req.user.accountId);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  async request(@Req() req: any, @Body() body: RequestLetterDto) {
    const el = body.eligibility as { proof: any; nonce: string };
    const ok = el && (await this.eligibility.consumeAndVerify(req.user.accountId, body.type, el.proof, el.nonce));
    if (!ok) throw new ForbiddenException('Bukti kelayakan (ZKP) tidak valid atau kedaluwarsa.');
    return this.letters.createRequest(req.user.accountId, body.type, body.formData);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  queue() {
    return this.letters.listQueue();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  mine(@Req() req: any) {
    return this.letters.listForWarga(req.user.accountId);
  }

  @Post(':id/draft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  async draft(@Req() req: any, @Param('id') id: string) {
    const res = await this.letters.draft(id);
    await this.audit.record(req.user.accountId, 'LETTER_DRAFT', id, { letterNumber: res.letterNumber });
    return res;
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  async reject(@Req() req: any, @Param('id') id: string) {
    const res = await this.letters.reject(id);
    await this.audit.record(req.user.accountId, 'LETTER_REJECT', id, {});
    return res;
  }

  @Get('signing-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  signingQueue() {
    return this.letters.listSigningQueue();
  }

  @Get(':id/for-signing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  forSigning(@Param('id') id: string) {
    return this.letters.forSigning(id);
  }

  @Post(':id/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('KADES')
  async sign(@Req() req: any, @Param('id') id: string, @Body() body: SignLetterDto) {
    const res = await this.letters.sign(req.user.accountId, id, body.signature);
    await this.audit.record(req.user.accountId, 'LETTER_SIGN', id, {
      letterNumber: res.letterNumber,
      qrToken: res.qrToken,
    });
    return res;
  }
}
