import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Post('challenge')
  challenge(@Body() body: { accountId: string }) {
    return this.auth.createChallenge(body.accountId);
  }

  @Post('verify')
  async verify(@Body() body: { accountId: string; nonce: string; signature: string }) {
    const res = await this.auth.verifyResponse(body.accountId, body.nonce, body.signature);
    if (!res.ok) throw new UnauthorizedException('Bukti tanda tangan tidak valid.');
    const token = this.jwt.sign({ accountId: body.accountId, role: res.role }, { expiresIn: '30m' });
    return { token, role: res.role };
  }
}
