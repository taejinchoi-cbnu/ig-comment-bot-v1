import type { AuthService } from '../auth/auth.service.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import { connectInstagram, type ConnectionOptions } from './connect.ts';
import { loginInstagram } from './login.ts';
import type { OAuthIntent } from './oauth.ts';

export async function completeInstagramOAuth(
  db: PrismaClient,
  intent: OAuthIntent,
  token: { accessToken: string; expiresAt: Date },
  auth: Pick<AuthService, 'issueInstagramSession'>,
  options: ConnectionOptions = {},
): Promise<string> {
  const account = intent.purpose === 'LOGIN'
    ? await loginInstagram(db, token, options)
    : await connectInstagram(db, intent.requestId, token, options);
  return auth.issueInstagramSession(account.userId, account.igAccountId);
}
