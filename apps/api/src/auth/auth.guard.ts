import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { PublicUser } from './auth.service.ts';
import { AuthService } from './auth.service.ts';

export type AuthenticatedRequest = Request & { user: PublicUser };
export const SESSION_COOKIE = 'ig_session';

export function readCookie(header: string | undefined, name: string): string | null {
  return header?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

export function assertSameOrigin(request: Request): void {
  const expected = process.env.PUBLIC_ORIGIN;
  const origin = request.headers.origin;
  if (!expected || origin !== expected) throw new ForbiddenException('요청 출처가 올바르지 않습니다');
}

export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  return match?.[1] ?? null;
}

export class AuthGuard implements CanActivate {
  private readonly auth: AuthService;

  constructor(auth: AuthService) {
    this.auth = auth;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    http.getResponse<{ setHeader(name: string, value: string): void }>().setHeader('Cache-Control', 'no-store');
    const request = http.getRequest<AuthenticatedRequest>();
    const bearer = bearerToken(request.headers.authorization);
    const token = bearer ?? readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!token) throw new UnauthorizedException('로그인이 필요합니다');
    if (!bearer && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) assertSameOrigin(request);
    request.user = await this.auth.authenticate(token, !bearer);
    return true;
  }
}
