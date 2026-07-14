import { describe, it, expect } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/jwt.guard';

function ctxWith(authHeader?: string): ExecutionContext {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new JwtAuthGuard(jwt);

  it('accepts a valid token and attaches req.user', () => {
    const token = jwt.sign({ accountId: 'acc-1', role: 'OPERATOR' }, { secret: 'test-secret' });
    const ctx = ctxWith(`Bearer ${token}`);
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user).toMatchObject({ accountId: 'acc-1', role: 'OPERATOR' });
  });

  it('rejects a missing token', () => {
    expect(() => guard.canActivate(ctxWith())).toThrow(UnauthorizedException);
  });

  it('rejects a tampered token', () => {
    expect(() => guard.canActivate(ctxWith('Bearer not.a.jwt'))).toThrow(UnauthorizedException);
  });
});
