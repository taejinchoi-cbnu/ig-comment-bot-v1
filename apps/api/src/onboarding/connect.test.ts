import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import type { PrismaClient } from '../generated/prisma/client.ts';
import { decrypt, generateKey } from '../crypto/cipher.ts';
import { connectInstagram } from './connect.ts';

const key = generateKey();
const token = { accessToken: 'new-token', expiresAt: new Date('2026-12-01') };

function fixture(existing = false, fields = ['comments', 'messages'], username = 'alice') {
  const writes: Record<string, unknown>[] = [];
  const account = existing ? { id: 'account-1', userId: 'user-1', slug: 'stable-slug', verifyToken: 'stable-verify' } : null;
  const db = {
    onboardingRequest: {
      findUnique: async () => ({ id: 'request-1', status: 'INVITED', instagramUsername: 'alice' }),
      update: async (args: { data: Record<string, unknown> }) => { writes.push(args.data); },
    },
    igAccount: {
      findUnique: async () => account,
      update: async (args: { data: Record<string, unknown> }) => { writes.push(args.data); return { ...account, ...args.data }; },
      create: async (args: { data: Record<string, unknown> }) => { writes.push(args.data); return { id: 'account-new', ...args.data }; },
    },
    user: {
      update: async (args: { data: Record<string, unknown> }) => { writes.push(args.data); },
      create: async (args: { data: Record<string, unknown> }) => { writes.push(args.data); return { id: 'user-new' }; },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  };
  const client = {
    getMe: async () => ({ userId: 'ig-1', username }),
    subscribeApp: async () => undefined,
    getSubscribedFields: async () => fields,
  };
  return { db: db as unknown as PrismaClient, client, writes };
}

test('reconnection preserves owner and webhook identifiers while rotating encrypted token', async () => {
  const { db, client, writes } = fixture(true);
  const result = await connectInstagram(db, 'request-1', token, { client, masterKey: key, appId: 'app', appSecret: 'app-secret' });
  assert.deepEqual(result, { userId: 'user-1', igAccountId: 'account-1' });
  assert.equal(decrypt(writes[0]?.accessTokenEnc as string, key), 'new-token');
  assert.equal(writes[0]?.slug, undefined);
  assert.equal(writes[0]?.verifyToken, undefined);
  assert.equal(writes[0]?.tokenExpiresAt, token.expiresAt);
});

test('new account is active only after both webhook subscriptions are observed', async () => {
  const missing = fixture(false, ['messages']);
  await assert.rejects(connectInstagram(missing.db, 'request-1', token, { client: missing.client, masterKey: key, appId: 'app', appSecret: 'app-secret' }), /subscription_missing/);
  assert.equal(missing.writes.length, 0);
  const mismatch = fixture(false, ['comments', 'messages'], 'bob');
  await assert.rejects(connectInstagram(mismatch.db, 'request-1', token, { client: mismatch.client, masterKey: key, appId: 'app', appSecret: 'app-secret' }), /account_mismatch/);
  assert.equal(mismatch.writes.length, 0);
  const valid = fixture();
  const result = await connectInstagram(valid.db, 'request-1', token, { client: valid.client, masterKey: key, appId: 'app', appSecret: 'app-secret' });
  assert.deepEqual(result, { userId: 'user-new', igAccountId: 'account-new' });
  assert.ok(valid.writes.some(write => write.status === 'CONNECTED'));
});
