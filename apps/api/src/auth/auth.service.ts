import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PrismaClient, User } from '../generated/prisma/client.ts';
import { hashPassword, verifyPassword } from './password.ts';

export const AUTH_PRISMA = Symbol('AUTH_PRISMA');

export type AuthPrisma = Pick<PrismaClient, 'user' | 'igAccount'>;
export type PublicUser = Pick<User, 'id' | 'email' | 'status' | 'createdAt'>;

type Credentials = { email?: unknown; password?: unknown };

function isUniqueViolation(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'code' in cause
    && (cause as { code?: unknown }).code === 'P2002';
}

function parseCredentials(input: Credentials): { email: string; password: string } {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new BadRequestException('올바른 이메일 주소를 입력해주세요');
  }
  if (password.length < 8 || password.length > 128) {
    throw new BadRequestException('비밀번호는 8자 이상 128자 이하여야 합니다');
  }
  return { email, password };
}

function publicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, status: user.status, createdAt: user.createdAt };
}

export class AuthService {
  private readonly prisma: AuthPrisma;
  private readonly jwt: JwtService;

  constructor(prisma: AuthPrisma, jwt: JwtService) {
    this.prisma = prisma;
    this.jwt = jwt;
  }

  async signup(input: Credentials): Promise<{ user: PublicUser }> {
    const { email, password } = parseCredentials(input);
    const passwordHash = await hashPassword(password);
    try {
      const user = await this.prisma.user.create({ data: { email, passwordHash } });
      return { user: publicUser(user) };
    } catch (cause) {
      if (isUniqueViolation(cause)) throw new ConflictException('이미 가입된 이메일입니다');
      throw cause;
    }
  }

  async login(input: Credentials): Promise<{ accessToken: string; user: PublicUser }> {
    const { email, password } = parseCredentials(input);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('가입 승인 대기 중입니다');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: publicUser(user),
    };
  }

  async authenticate(token: string, requireInstagramSession = false): Promise<PublicUser> {
    let payload: { sub?: unknown; igAccountId?: unknown; kind?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; igAccountId?: unknown; kind?: unknown }>(token);
    } catch {
      throw new UnauthorizedException('로그인이 필요합니다');
    }
    if (typeof payload.sub !== 'string') throw new UnauthorizedException('로그인이 필요합니다');
    if (requireInstagramSession && (payload.kind !== 'instagram_session' || typeof payload.igAccountId !== 'string')) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('로그인이 필요합니다');
    if (payload.igAccountId !== undefined) {
      if (typeof payload.igAccountId !== 'string') throw new UnauthorizedException('로그인이 필요합니다');
      const account = await this.prisma.igAccount.findFirst({ where: { id: payload.igAccountId, userId: user.id, status: 'CONNECTED' } });
      if (!account) throw new UnauthorizedException('로그인이 필요합니다');
    }
    return publicUser(user);
  }

  async issueInstagramSession(userId: string, igAccountId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, igAccountId, kind: 'instagram_session' });
  }
}
