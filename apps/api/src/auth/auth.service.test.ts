import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../generated/prisma/client.ts';
import { AuthService, type AuthPrisma } from './auth.service.ts';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user_1',
    email: 'person@example.com',
    passwordHash: '',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function serviceFor(initial: User[] = []) {
  const users = new Map(initial.map((value) => [value.email, value]));
  const prisma = {
    igAccount: { findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
      where.id === 'account_1' && where.userId === 'user_1' ? { id: 'account_1' } : null },
    user: {
      create: async ({ data }: { data: { email: string; passwordHash: string } }) => {
        if (users.has(data.email)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
        const created = user({ id: `user_${users.size + 1}`, ...data });
        users.set(created.email, created);
        return created;
      },
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return users.get(where.email) ?? null;
        return [...users.values()].find((value) => value.id === where.id) ?? null;
      },
    },
  } as unknown as AuthPrisma;
  const jwt = new JwtService({ secret: 'test-secret-at-least-32-bytes-long', signOptions: { expiresIn: '7d' } });
  return { auth: new AuthService(prisma, jwt), users };
}

test('가입은 이메일을 정규화하고 PENDING 사용자와 Argon2id 해시를 만든다', async () => {
  const { auth, users } = serviceFor();
  const result = await auth.signup({ email: '  Person@Example.COM ', password: 'password123' });

  assert.equal(result.user.email, 'person@example.com');
  assert.equal(result.user.status, 'PENDING');
  assert.match(users.get('person@example.com')?.passwordHash ?? '', /^\$argon2id\$/);
  assert.equal('passwordHash' in result.user, false);
});

test('브라우저 쿠키에는 연결 계정에 묶인 세션만 허용한다', async () => {
  const { auth } = serviceFor([user({ status: 'ACTIVE' })]);
  const session = await auth.issueInstagramSession('user_1', 'account_1');
  assert.equal((await auth.authenticate(session, true)).id, 'user_1');
  const invalidAccount = await auth.issueInstagramSession('user_1', 'other');
  await assert.rejects(auth.authenticate(invalidAccount, true), UnauthorizedException);
  const jwt = new JwtService({ secret: 'test-secret-at-least-32-bytes-long' });
  const operatorToken = await jwt.signAsync({ sub: 'user_1' });
  await assert.rejects(auth.authenticate(operatorToken, true), UnauthorizedException);
  assert.equal((await auth.authenticate(operatorToken)).id, 'user_1');
});

test('중복 이메일 가입은 Conflict로 거절한다', async () => {
  const { auth } = serviceFor();
  await auth.signup({ email: 'person@example.com', password: 'password123' });
  await assert.rejects(
    auth.signup({ email: 'PERSON@example.com', password: 'different123' }),
    ConflictException,
  );
});

test('PENDING 사용자는 올바른 비밀번호여도 로그인할 수 없다', async () => {
  const { auth, users } = serviceFor();
  await auth.signup({ email: 'person@example.com', password: 'password123' });
  assert.equal(users.get('person@example.com')?.status, 'PENDING');
  await assert.rejects(auth.login({ email: 'person@example.com', password: 'password123' }), ForbiddenException);
});

test('ACTIVE 사용자는 로그인하고 토큰으로 본인을 다시 조회한다', async () => {
  const { auth, users } = serviceFor();
  await auth.signup({ email: 'person@example.com', password: 'password123' });
  const pending = users.get('person@example.com');
  assert.ok(pending);
  users.set(pending.email, { ...pending, status: 'ACTIVE' });

  const loggedIn = await auth.login({ email: 'person@example.com', password: 'password123' });
  assert.ok(loggedIn.accessToken.length > 20);
  assert.equal((await auth.authenticate(loggedIn.accessToken)).id, pending.id);
  await assert.rejects(auth.authenticate(`${loggedIn.accessToken}broken`), UnauthorizedException);
});

test('틀린 비밀번호는 사용자 존재 여부와 무관하게 Unauthorized로 거절한다', async () => {
  const { auth } = serviceFor();
  await assert.rejects(auth.login({ email: 'missing@example.com', password: 'password123' }), UnauthorizedException);
});


test('Instagram session is valid for seven days and expired sessions are rejected', async () => {
  const { auth } = serviceFor([user({ status: 'ACTIVE' })]);
  const jwt = new JwtService({ secret: 'test-secret-at-least-32-bytes-long' });
  const session = await auth.issueInstagramSession('user_1', 'account_1');
  const claims = jwt.decode<{ exp: number; iat: number; kind: string }>(session);
  assert.equal(claims.exp - claims.iat, 7 * 24 * 60 * 60);
  assert.equal(claims.kind, 'instagram_session');
  const expired = await jwt.signAsync({ sub: 'user_1', igAccountId: 'account_1', kind: 'instagram_session' }, { expiresIn: -1 });
  await assert.rejects(auth.authenticate(expired, true), UnauthorizedException);
});
