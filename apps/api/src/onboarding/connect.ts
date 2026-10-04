import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma/client.ts';
import { getMasterKey } from '../config/runtime.ts';
import { encrypt } from '../crypto/cipher.ts';
import { InstagramApiClient } from '../instagram/client.ts';
import { oauthConfig } from './oauth.ts';

export type ConnectionOptions = { masterKey?: Buffer; appId?: string; appSecret?: string; parentAppSecret?: string; client?: Pick<InstagramApiClient, 'getMe' | 'subscribeApp' | 'getSubscribedFields'> };

export type ConnectError = 'account_mismatch' | 'subscription_missing' | 'connection_failed';

export async function connectInstagram(
  db: PrismaClient,
  requestId: string,
  token: { accessToken: string; expiresAt: Date },
  options: ConnectionOptions = {},
): Promise<{ userId: string; igAccountId: string }> {
  const request = await db.onboardingRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== 'INVITED') throw new Error('connection_failed');
  const client = options.client ?? new InstagramApiClient({ igUserId: 'me', accessToken: token.accessToken });
  const me = await client.getMe();
  if (!me.username || me.username.toLowerCase() !== request.instagramUsername.toLowerCase()) throw new Error('account_mismatch');
  const credentials = await verifiedCredentials(client, me.username, token, options);

  return db.$transaction(async tx => {
    const existing = await tx.igAccount.findUnique({ where: { igUserId: me.userId } });
    if (existing) {
      const account = await tx.igAccount.update({ where: { id: existing.id }, data: credentials });
      await tx.user.update({ where: { id: existing.userId }, data: { status: 'ACTIVE' } });
      await tx.onboardingRequest.update({ where: { id: requestId }, data: { status: 'CONNECTED', errorCode: null } });
      return { userId: account.userId, igAccountId: account.id };
    }
    const user = await tx.user.create({ data: { status: 'ACTIVE' } });
    const account = await tx.igAccount.create({ data: {
      userId: user.id, igUserId: me.userId,
      slug: `ig-${randomBytes(12).toString('hex')}`,
      verifyToken: randomBytes(24).toString('base64url'),
      ...credentials,
    } });
    await tx.onboardingRequest.update({ where: { id: requestId }, data: { status: 'CONNECTED', errorCode: null } });
    return { userId: user.id, igAccountId: account.id };
  });
}

export async function verifiedCredentials(
  client: NonNullable<ConnectionOptions['client']>,
  username: string,
  token: { accessToken: string; expiresAt: Date },
  options: ConnectionOptions,
) {
  await client.subscribeApp();
  const fields = await client.getSubscribedFields(options.appId ?? oauthConfig().appId);
  if (!['comments', 'messages'].every(field => fields.includes(field))) throw new Error('subscription_missing');

  const key = options.masterKey ?? await getMasterKey();
  const appSecret = options.appSecret ?? oauthConfig().appSecret;
  const parentAppSecret = options.parentAppSecret ?? process.env.META_PARENT_APP_SECRET;
  return {
    accessTokenEnc: encrypt(token.accessToken, key),
    appSecretEnc: encrypt(appSecret, key),
    ...(parentAppSecret ? { parentAppSecretEnc: encrypt(parentAppSecret, key) } : {}),
    username,
    tokenExpiresAt: token.expiresAt,
    subscribedAt: new Date(),
    status: 'CONNECTED' as const,
  };
}
