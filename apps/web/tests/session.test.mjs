import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../src/api/client.ts';
import { clearSession, createSessionClient, getSession, logout, ME_KEY, sessionOptions } from '../src/api/session.ts';

const user = { user: { id: 'user-1', email: null, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z' } };
const storage = () => ({ removed: [], removeItem(key) { this.removed.push(key); } });

test('me distinguishes 200, 401, 5xx and network failure without retrying', async t => {
  for (const [response, expected] of [[Response.json(user), user], [Response.json({}, { status: 401 }), null]]) {
    t.mock.method(globalThis, 'fetch', async (path, init) => {
      assert.equal(path, '/api/auth/me'); assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store');
      return response;
    });
    assert.deepEqual(await getSession(), expected);
    t.mock.restoreAll();
  }
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({}, { status: 503 }); });
  const client = new QueryClient();
  await assert.rejects(client.fetchQuery(sessionOptions), error => error instanceof ApiError && error.status === 503);
  assert.equal(calls, 1);
  client.clear(); t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(getSession(), /offline/);
});

test('204 logout cancels pending requests and removes user cache and completed onboarding ID', async t => {
  const client = new QueryClient(); const local = storage();
  client.setQueryData(ME_KEY, user); client.setQueryData(['posts'], ['private']);
  let resolveLate; let signal;
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    if (path === '/api/auth/logout') { assert.equal(init.method, 'POST'); assert.equal(init.credentials, 'include'); return new Response(null, { status: 204 }); }
    signal = init.signal;
    // Simulate a server that ignores cancellation and completes after logout.
    return new Promise(resolve => { resolveLate = resolve; });
  });
  const pending = client.fetchQuery({ queryKey: ['private'], queryFn: ({ signal }) => apiFetch('/api/private', { signal }) }).catch(() => undefined);
  await logout(client, local);
  assert.equal(signal.aborted, true);
  assert.equal(client.getQueryData(['posts']), undefined);
  assert.equal(client.getQueryData(ME_KEY), null);
  assert.deepEqual(local.removed, ['onboardingRequestId']);
  resolveLate(Response.json({ secret: 'late' })); await pending;
  assert.equal(client.getQueryData(['private']), undefined);
  client.clear();
});

test('failed logout preserves session and caches for retry', async t => {
  const client = new QueryClient(); const local = storage();
  client.setQueryData(ME_KEY, user); client.setQueryData(['posts'], ['private']);
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 403 }));
  await assert.rejects(logout(client, local), error => error.status === 403);
  assert.deepEqual(client.getQueryData(ME_KEY), user);
  assert.deepEqual(client.getQueryData(['posts']), ['private']); assert.deepEqual(local.removed, []);
  client.clear();
});

test('protected 401 expires session; 403 and network errors preserve it', async t => {
  const local = storage(); let redirects = 0;
  const client = createSessionClient(local, () => { redirects++; });
  client.setQueryData(ME_KEY, user);
  for (const status of [403, 401]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status }));
    await assert.rejects(client.fetchQuery({ queryKey: ['protected', status], queryFn: () => apiFetch('/api/private'), retry: false }));
    await new Promise(resolve => setImmediate(resolve));
    if (status === 403) { assert.deepEqual(client.getQueryData(ME_KEY), user); assert.equal(redirects, 0); }
    t.mock.restoreAll();
  }
  assert.equal(client.getQueryData(ME_KEY), null); assert.equal(redirects, 1);
  client.setQueryData(ME_KEY, user);
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(client.fetchQuery({ queryKey: ['offline'], queryFn: () => apiFetch('/api/private'), retry: false }));
  assert.deepEqual(client.getQueryData(ME_KEY), user); assert.equal(redirects, 1);
  client.clear();
});

test('anonymous me preserves a pending signup while expiration removes private cached data', async t => {
  const local = storage(); let redirects = 0;
  const client = createSessionClient(local, () => { redirects++; });
  client.setQueryData(ME_KEY, user); client.setQueryData(['posts'], ['private']);
  client.setQueryData(['onboarding-request', 'pending'], { status: 'INVITED' });
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }));
  assert.equal(await client.fetchQuery(sessionOptions), null);
  assert.equal(client.getQueryData(['posts']), undefined);
  assert.deepEqual(client.getQueryData(['onboarding-request', 'pending']), { status: 'INVITED' });
  assert.deepEqual(local.removed, []); assert.equal(redirects, 0);
  await clearSession(client, local); client.clear();
});

test('a late me response cannot restore a session after logout', async t => {
  const client = new QueryClient(); const local = storage();
  client.setQueryData(ME_KEY, user);
  let completeMe; let sessionSignal;
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    if (path === '/api/auth/logout') return new Response(null, { status: 204 });
    sessionSignal = init.signal;
    return new Promise(resolve => { completeMe = resolve; });
  });
  const pending = client.fetchQuery(sessionOptions).catch(() => undefined);
  await logout(client, local);
  assert.equal(sessionSignal.aborted, true);
  completeMe(Response.json(user)); await pending;
  assert.equal(client.getQueryData(ME_KEY), null);
  client.clear();
});
