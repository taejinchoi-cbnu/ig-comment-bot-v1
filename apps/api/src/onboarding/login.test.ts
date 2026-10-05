import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import type { PrismaClient } from '../generated/prisma/client.ts';
import { decrypt, generateKey } from '../crypto/cipher.ts';
import { loginInstagram } from './login.ts';
import { completeInstagramOAuth } from './complete.ts';

const key = generateKey();
const token = { accessToken: 'rotated-token', expiresAt: new Date('2026-12-01') };
function fixture(status = 'CONNECTED', ownerStatus = 'ACTIVE', fields = ['comments', 'messages'], present = true, count = 1) {
  const writes: { where: Record<string, unknown>; data: Record<string, unknown> }[] = [];
  const calls: string[] = [];
  const account = { id: 'account-1', userId: 'owner-1', slug: 'stable-slug', verifyToken: 'stable-verify', status, user: { status: ownerStatus } };
  const db = { igAccount: {
    findUnique: async ({ where }: { where: { igUserId: string } }) => { assert.deepEqual(where, { igUserId: 'ig-1' }); return present ? account : null; },
    updateMany: async (args: typeof writes[number]) => { writes.push(args); return { count }; },
  } } as unknown as PrismaClient;
  const options = { masterKey: key, appId: 'app', appSecret: 'app-secret', client: {
    getMe: async () => { calls.push('me'); return { userId: 'ig-1', username: 'renamed-user' }; },
    subscribeApp: async () => { calls.push('subscribe'); },
    getSubscribedFields: async (appId?: string) => { assert.equal(appId, 'app'); calls.push('verify'); return fields; },
  } };
  return { db, options, writes, calls, account };
}

test('login rotates encrypted credentials, preserves ownership/webhook IDs and checks actual subscriptions', async () => {
  const f = fixture();
  assert.deepEqual(await loginInstagram(f.db, token, f.options), { userId: 'owner-1', igAccountId: 'account-1' });
  assert.deepEqual(f.calls, ['me', 'subscribe', 'verify']);
  const write = f.writes[0]!;
  assert.deepEqual(write.where, { id: 'account-1', userId: 'owner-1', status: 'CONNECTED', user: { status: 'ACTIVE' } });
  assert.equal(decrypt(write.data.accessTokenEnc as string, key), token.accessToken);
  assert.equal(write.data.username, 'renamed-user');
  assert.equal(write.data.tokenExpiresAt, token.expiresAt);
  for (const field of ['id', 'igUserId', 'userId', 'slug', 'verifyToken']) assert.equal(field in write.data, false);
});

test('unknown, disconnected and inactive accounts are rejected before subscriptions or writes', async () => {
  for (const f of [fixture('DRAFT'), fixture('ERROR'), fixture('CONNECTED', 'PENDING'), fixture('CONNECTED', 'ACTIVE', undefined, false)]) {
    await assert.rejects(loginInstagram(f.db, token, f.options), /account_not_connected|user_inactive/);
    assert.deepEqual(f.calls, ['me']);
    assert.equal(f.writes.length, 0);
  }
});

test('missing subscriptions and changed eligibility never produce a successful login', async () => {
  const missing = fixture('CONNECTED', 'ACTIVE', ['messages']);
  await assert.rejects(loginInstagram(missing.db, token, missing.options), /subscription_missing/);
  assert.equal(missing.writes.length, 0);
  const changed = fixture('CONNECTED', 'ACTIVE', undefined, true, 0);
  await assert.rejects(loginInstagram(changed.db, token, changed.options), /account_not_connected/);
});


test('OAuth issues a session only after eligible account and subscription verification', async () => {
  let issued = 0;
  const auth = { issueInstagramSession: async (userId: string, accountId: string) => {
    assert.equal(userId, 'owner-1'); assert.equal(accountId, 'account-1'); issued++; return 'session';
  } };
  for (const f of [fixture('DRAFT'), fixture('CONNECTED', 'PENDING'), fixture('CONNECTED', 'ACTIVE', ['messages'])]) {
    await assert.rejects(completeInstagramOAuth(f.db, { purpose: 'LOGIN', requestId: null }, token, auth, f.options));
  }
  assert.equal(issued, 0);
  const valid = fixture();
  assert.equal(await completeInstagramOAuth(valid.db, { purpose: 'LOGIN', requestId: null }, token, auth, valid.options), 'session');
  assert.equal(issued, 1);
});
