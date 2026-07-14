import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Sesi tidak ditemukan. Masuk kembali.');
    try {
      // Verify with the JwtService's configured secret (registered in AuthModule).
      const payload = this.jwt.verify(token);
      req.user = { accountId: payload.accountId, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sesi tidak valid. Masuk kembali.');
    }
  }
}
