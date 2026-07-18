import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { LetterService } from './letter.service';
import { LetterType } from './letter.template';
import { EligibilityService, EligibilityProofDto } from '../registry/eligibility.service';

@Controller('letters')
export class LetterController {
  constructor(
    private readonly letters: LetterService,
    private readonly eligibility: EligibilityService,
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
  async request(
    @Req() req: any,
    @Body() body: { type: LetterType; formData: Record<string, string>; eligibility: { proof: EligibilityProofDto; nonce: string } },
  ) {
    const el = body.eligibility;
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
  draft(@Param('id') id: string) {
    return this.letters.draft(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  reject(@Param('id') id: string) {
    return this.letters.reject(id);
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
  sign(@Req() req: any, @Param('id') id: string, @Body() body: { signature: string }) {
    return this.letters.sign(req.user.accountId, id, body.signature);
  }
}
