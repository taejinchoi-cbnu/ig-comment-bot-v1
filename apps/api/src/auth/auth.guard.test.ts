import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthService } from './auth.service.ts';
import type { Request } from 'express';
import { assertSameOrigin, AuthGuard, bearerToken, readCookie } from './auth.guard.ts';

test('Bearer 토큰만 정확히 추출한다', () => {
  assert.equal(bearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(bearerToken('bearer token'), 'token');
  assert.equal(bearerToken('Basic token'), null);
  assert.equal(bearerToken('Bearer two tokens'), null);
  assert.equal(bearerToken(undefined), null);
});

test('session cookie is read and writes require exact public origin', () => {
  assert.equal(readCookie('other=1; ig_session=abc.def; x=2', 'ig_session'), 'abc.def');
  const old = process.env.PUBLIC_ORIGIN;
  process.env.PUBLIC_ORIGIN = 'https://example.test';
  try {
    assert.doesNotThrow(() => assertSameOrigin({ headers: { origin: 'https://example.test' } } as Request));
    assert.throws(() => assertSameOrigin({ headers: { origin: 'https://evil.test' } } as Request));
    assert.throws(() => assertSameOrigin({ headers: {} } as Request));
  } finally {
    if (old === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = old;
  }
});


test('guard keeps Bearer precedence and marks successful and rejected session responses no-store', async () => {
  const calls: unknown[][] = [];
  const auth = { authenticate: async (...args: unknown[]) => { calls.push(args); return { id: 'user-1' }; } } as unknown as AuthService;
  const guard = new AuthGuard(auth);
  let cache = '';
  const context = (headers: Record<string, string>) => ({ switchToHttp: () => ({
    getRequest: () => ({ method: 'GET', headers }),
    getResponse: () => ({ setHeader: (name: string, value: string) => { assert.equal(name, 'Cache-Control'); cache = value; } }),
  }) }) as ExecutionContext;
  assert.equal(await guard.canActivate(context({ authorization: 'Bearer operator', cookie: 'ig_session=session' })), true);
  assert.deepEqual(calls[0], ['operator', false]);
  assert.equal(await guard.canActivate(context({ cookie: 'ig_session=session' })), true);
  assert.deepEqual(calls[1], ['session', true]);
  await assert.rejects(guard.canActivate(context({})));
  assert.equal(cache, 'no-store');
});
