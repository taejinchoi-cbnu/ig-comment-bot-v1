import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request } from 'express';
import { assertSameOrigin, bearerToken, readCookie } from './auth.guard.ts';

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
