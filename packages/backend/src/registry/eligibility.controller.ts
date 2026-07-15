import { Body, Controller, Post } from '@nestjs/common';
import { EligibilityService, EligibilityProofDto } from './eligibility.service';

@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibility: EligibilityService) {}

  @Post('verify')
  verify(@Body() body: { proof: EligibilityProofDto; context: string }) {
    return this.eligibility.verify(body.proof, body.context);
  }
}
