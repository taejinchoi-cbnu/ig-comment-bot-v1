import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { consumeOAuthState, exchangeCode, startOAuth, startLoginOAuth, type OAuthDb } from './oauth.ts';

const config = { appId: 'app', appSecret: 'secret', origin: 'https://example.test', redirectUri: 'https://example.test/oauth/instagram/callback' };

test('only invited requests start OAuth; state belongs to one browser and is single use', async () => {
  let status = 'REQUESTED';
  let row: { id: string; browserHash: string; expiresAt: Date; consumedAt: Date | null; requestId: string | null; purpose: 'CONNECT' | 'LOGIN' } = { id: '', browserHash: '', expiresAt: new Date(0), consumedAt: null, requestId: '', purpose: 'CONNECT' };
  const db = {
    onboardingRequest: { findUnique: async () => ({ status }) },
    oAuthState: {
      create: async ({ data }: { data: typeof row }) => { row = { ...data, consumedAt: null }; },
      findUnique: async () => row,
      updateMany: async () => { if (row.consumedAt) return { count: 0 }; row.consumedAt = new Date(); return { count: 1 }; },
    },
  } as unknown as OAuthDb;
  assert.deepEqual(await startOAuth(db, 'request', config), { error: 'not_invited' });
  status = 'INVITED';
  const started = await startOAuth(db, 'request', config);
  assert.ok('url' in started && 'browser' in started);
  if (!('url' in started) || !started.url || !started.browser) return;
  const state = new URL(started.url).searchParams.get('state')!;
  assert.equal(await consumeOAuthState(db, state, 'other-browser'), null);
  assert.deepEqual(await consumeOAuthState(db, state, started.browser), { purpose: 'CONNECT', requestId: 'request' });
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
  row.consumedAt = null; row.expiresAt = new Date(0);
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
});

test('token exchange uses required endpoints and checks permission and expiry', async () => {
  const calls: string[] = [];
  const fake = async (url: string | URL) => {
    calls.push(String(url));
    return Response.json(calls.length === 1
      ? { access_token: 'short', permissions: ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'] }
      : { access_token: 'long', expires_in: 3600 });
  };
  const result = await exchangeCode('code', config, fake as typeof fetch);
  assert.equal(result.accessToken, 'long');
  assert.match(calls[0]!, /api\.instagram\.com\/oauth\/access_token/);
  assert.match(calls[1]!, /graph\.instagram\.com\/access_token/);
  await assert.rejects(exchangeCode('code', config, async () => Response.json({ access_token: 'short', permissions: [] }) as never), /permission_denied/);
});


test('login state needs no onboarding request and rejects another browser, expiration and reuse', async () => {
  let row: { id: string; purpose: string; requestId: string | null; browserHash: string; expiresAt: Date; consumedAt: Date | null };
  const db = {
    onboardingRequest: { findUnique: async () => { throw new Error('login must not query onboarding'); } },
    oAuthState: {
      create: async ({ data }: { data: typeof row }) => { row = { ...data, consumedAt: null }; },
      findUnique: async () => row,
      updateMany: async () => { if (row.consumedAt) return { count: 0 }; row.consumedAt = new Date(); return { count: 1 }; },
    },
  } as unknown as OAuthDb;
  const started = await startLoginOAuth(db, config);
  const state = new URL(started.url).searchParams.get('state')!;
  assert.equal(await consumeOAuthState(db, state, undefined), null);
  assert.equal(await consumeOAuthState(db, state, 'another-browser'), null);
  assert.deepEqual(await consumeOAuthState(db, state, started.browser), { purpose: 'LOGIN', requestId: null });
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
  row!.consumedAt = null;
  row!.expiresAt = new Date(0);
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
  row!.expiresAt = new Date(Date.now() + 10_000);
  row!.requestId = 'forged-request';
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
  row!.purpose = 'CONNECT'; row!.requestId = null;
  assert.equal(await consumeOAuthState(db, state, started.browser), null);
});

test('atomic consumption permits only one concurrent login callback', async () => {
  let row: Record<string, unknown>;
  let consumed = false;
  const db = { oAuthState: {
    create: async ({ data }: { data: Record<string, unknown> }) => { row = data; },
    findUnique: async () => ({ ...row, consumedAt: null }),
    updateMany: async () => { if (consumed) return { count: 0 }; consumed = true; return { count: 1 }; },
  } } as unknown as OAuthDb;
  const started = await startLoginOAuth(db, config);
  const state = new URL(started.url).searchParams.get('state')!;
  const results = await Promise.all([consumeOAuthState(db, state, started.browser), consumeOAuthState(db, state, started.browser)]);
  assert.equal(results.filter(Boolean).length, 1);
});
