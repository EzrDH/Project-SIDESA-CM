import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ChallengeDto, VerifyDto } from './auth.dto';

@Controller('auth')
// Tighter limit than the global default: sign-in is a brute-force target.
@Throttle({ default: { ttl: 60_000, limit: 15 } })
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Post('challenge')
  challenge(@Body() body: ChallengeDto) {
    return this.auth.createChallenge(body.accountId);
  }

  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    const res = await this.auth.verifyResponse(body.accountId, body.nonce, body.signature);
    if (!res.ok) throw new UnauthorizedException('Bukti tanda tangan tidak valid.');
    const token = this.jwt.sign({ accountId: body.accountId, role: res.role }, { expiresIn: '30m' });
    return { token, role: res.role };
  }
}
