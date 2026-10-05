import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.ts';
import { AUTH_PRISMA, AuthService, type AuthPrisma } from '../src/auth/auth.service.ts';
import type { User } from '../src/generated/prisma/client.ts';

const secret = 'test-only-jwt-secret-at-least-32-bytes';
let app: INestApplication;
let auth: AuthService;
let jwt: JwtService;
let user: User;
let accountConnected: boolean;

beforeEach(async () => {
  user = { id: 'user-1', email: null, passwordHash: null, status: 'ACTIVE', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
  accountConnected = true;
  const prisma = {
    user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === user.id ? user : null },
    igAccount: { findFirst: async ({ where }: { where: { id: string; userId: string; status: string } }) =>
      accountConnected && where.id === 'account-1' && where.userId === user.id && where.status === 'CONNECTED' ? { id: 'account-1' } : null },
  } as unknown as AuthPrisma;
  jwt = new JwtService({ secret, signOptions: { expiresIn: '7d' } });
  const module = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(AUTH_PRISMA).useValue(prisma)
    .overrideProvider(JwtService).useValue(jwt).compile();
  auth = module.get(AuthService);
  app = module.createNestApplication();
  await app.init();
});
afterEach(async () => { await app?.close(); });

const me = () => request(app.getHttpServer()).get('/api/auth/me').expect('Cache-Control', 'no-store');

describe('session authentication over HTTP', () => {
  test('cookie session and Bearer token return a public user without credentials', async () => {
    const cookie = await auth.issueInstagramSession(user.id, 'account-1');
    const bearer = await jwt.signAsync({ sub: user.id });
    for (const headers of [{ Cookie: `ig_session=${cookie}` }, { Authorization: `Bearer ${bearer}` }]) {
      const result = await me().set(headers).expect(200);
      expect(result.body).toEqual({ user: { id: user.id, email: null, status: 'ACTIVE', createdAt: user.createdAt.toISOString() } });
    }
  });
  test('Bearer takes precedence over a valid cookie', async () => {
    const cookie = await auth.issueInstagramSession(user.id, 'account-1');
    await me().set('Cookie', `ig_session=${cookie}`).set('Authorization', 'Bearer invalid').expect(401);
  });
  test('missing, invalid, expired and operator cookie sessions are rejected', async () => {
    await me().expect(401);
    const expired = await jwt.signAsync({ sub: user.id, igAccountId: 'account-1', kind: 'instagram_session' }, { expiresIn: -1 });
    const operator = await jwt.signAsync({ sub: user.id });
    for (const token of ['invalid', expired, operator]) await me().set('Cookie', `ig_session=${token}`).expect(401);
  });
  test('disconnected accounts and inactive users invalidate a previously issued session', async () => {
    const token = await auth.issueInstagramSession(user.id, 'account-1');
    accountConnected = false;
    await me().set('Cookie', `ig_session=${token}`).expect(401);
    accountConnected = true; user.status = 'PENDING';
    await me().set('Cookie', `ig_session=${token}`).expect(401);
  });
});

describe('logout over HTTP', () => {
  test('same origin returns 204 and clears the cookie at its original path', async () => {
    const result = await request(app.getHttpServer()).post('/api/auth/logout').set('Origin', 'https://example.test')
      .expect(204).expect('Cache-Control', 'no-store');
    expect(result.headers['set-cookie']).toEqual([expect.stringMatching(/^ig_session=; Path=\/; Expires=Thu, 01 Jan 1970/)]);
    expect(result.text).toBe('');
  });
  test.each([undefined, 'https://evil.test', 'https://example.test.evil.test'])('rejects incorrect origin %s without clearing a cookie', async origin => {
    const pending = request(app.getHttpServer()).post('/api/auth/logout');
    if (origin) pending.set('Origin', origin);
    const result = await pending.expect(403).expect('Cache-Control', 'no-store');
    expect(result.headers['set-cookie']).toBeUndefined();
  });
});
