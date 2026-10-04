import type { PrismaClient } from '../generated/prisma/client.ts';
import { InstagramApiClient } from '../instagram/client.ts';
import { verifiedCredentials, type ConnectionOptions } from './connect.ts';

// The global Instagram ID lookup establishes the tenant; every write uses its account ID.
export async function loginInstagram(
  db: Pick<PrismaClient, 'igAccount'>,
  token: { accessToken: string; expiresAt: Date },
  options: ConnectionOptions = {},
): Promise<{ userId: string; igAccountId: string }> {
  const client = options.client ?? new InstagramApiClient({ igUserId: 'me', accessToken: token.accessToken });
  const me = await client.getMe();
  const account = await db.igAccount.findUnique({ where: { igUserId: me.userId }, include: { user: true } });
  if (!account || account.status !== 'CONNECTED') throw new Error('account_not_connected');
  if (account.user.status !== 'ACTIVE') throw new Error('user_inactive');
  const credentials = await verifiedCredentials(client, me.username, token, options);
  // Recheck eligibility on the write in case the owner/account changed during OAuth calls.
  const updated = await db.igAccount.updateMany({
    where: { id: account.id, userId: account.userId, status: 'CONNECTED', user: { status: 'ACTIVE' } },
    data: credentials,
  });
  if (updated.count !== 1) throw new Error('account_not_connected');
  return { userId: account.userId, igAccountId: account.id };
}
