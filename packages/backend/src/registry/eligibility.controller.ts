import { Body, Controller, Post } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { VerifyEligibilityDto } from './eligibility.dto';

@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibility: EligibilityService) {}

  @Post('verify')
  verify(@Body() body: VerifyEligibilityDto) {
    return this.eligibility.verify(body.proof, body.context);
  }
}
