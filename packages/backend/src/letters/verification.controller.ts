import { Controller, Get, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verify')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get(':token')
  verify(@Param('token') token: string) {
    return this.verification.verifyByToken(token);
  }
}
