import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../src/rbac/roles.guard';
import { ROLES_KEY } from '../src/rbac/roles.decorator';

function ctx(role: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  it('allows a permitted role', () => {
    const reflector = { getAllAndOverride: () => ['KADES'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx('KADES'))).toBe(true);
  });

  it('denies a role not in the list', () => {
    const reflector = { getAllAndOverride: () => ['KADES'] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx('WARGA'))).toThrow(ForbiddenException);
  });

  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx('WARGA'))).toBe(true);
  });

  it('exposes ROLES_KEY for the decorator', () => {
    expect(typeof ROLES_KEY).toBe('string');
  });
});
