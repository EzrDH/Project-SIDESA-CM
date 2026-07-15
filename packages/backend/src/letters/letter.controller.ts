import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { LetterService } from './letter.service';
import { LetterType } from './letter.template';

@Controller('letters')
export class LetterController {
  constructor(private readonly letters: LetterService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  request(@Req() req: any, @Body() body: { type: LetterType; formData: Record<string, string> }) {
    return this.letters.createRequest(req.user.accountId, body.type, body.formData);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OPERATOR')
  queue() {
    return this.letters.listQueue();
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
