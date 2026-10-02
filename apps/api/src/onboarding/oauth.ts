import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma/client.ts';

export const OAUTH_COOKIE = 'ig_oauth_browser';
export const OAUTH_TTL_MS = 10 * 60 * 1000;
export const OAUTH_SCOPES = ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'];
export type OAuthDb = Pick<PrismaClient, 'onboardingRequest' | 'oAuthState'>;
export type OAuthError = 'invalid_request' | 'not_invited' | 'state_invalid' | 'access_denied' | 'permission_denied' | 'token_exchange_failed';

export function oauthConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const origin = process.env.PUBLIC_ORIGIN;
  if (!appId || !appSecret || !origin || !/^https:\/\/[^/]+$/.test(origin)) throw new Error('INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, PUBLIC_ORIGIN(HTTPS)가 필요합니다');
  return { appId, appSecret, origin, redirectUri: `${origin}/oauth/instagram/callback` };
}

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function startOAuth(db: OAuthDb, requestId: string, config = oauthConfig()) {
  const request = await db.onboardingRequest.findUnique({ where: { id: requestId } });
  if (request?.status !== 'INVITED') return { error: 'not_invited' as OAuthError };
  const state = randomBytes(32).toString('base64url');
  const browser = randomBytes(32).toString('base64url');
  await db.oAuthState.create({ data: { id: state, requestId, browserHash: hash(browser), expiresAt: new Date(Date.now() + OAUTH_TTL_MS) } });
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, response_type: 'code', scope: OAUTH_SCOPES.join(','), state }).toString();
  return { url: url.toString(), browser };
}

export async function consumeOAuthState(db: OAuthDb, state: string | undefined, browser: string | undefined) {
  if (!state || !browser || !/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
  const row = await db.oAuthState.findUnique({ where: { id: state } });
  if (!row || row.expiresAt <= new Date() || row.consumedAt || !safeEqual(row.browserHash, hash(browser))) return null;
  const updated = await db.oAuthState.updateMany({ where: { id: state, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  return updated.count === 1 ? row.requestId : null;
}

export async function exchangeCode(code: string, config = oauthConfig(), fetchImpl: typeof fetch = fetch) {
  const form = new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, grant_type: 'authorization_code', redirect_uri: config.redirectUri, code });
  const shortResponse = await fetchImpl('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
  if (!shortResponse.ok) throw new Error('token_exchange_failed');
  const short = await shortResponse.json() as { access_token?: string; permissions?: string[] };
  if (!short.access_token) throw new Error('token_exchange_failed');
  if (short.permissions && !OAUTH_SCOPES.every(scope => short.permissions?.includes(scope))) throw new Error('permission_denied');
  const url = new URL('https://graph.instagram.com/access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: config.appSecret, access_token: short.access_token }).toString();
  const longResponse = await fetchImpl(url);
  if (!longResponse.ok) throw new Error('token_exchange_failed');
  const long = await longResponse.json() as { access_token?: string; expires_in?: number };
  if (!long.access_token || !Number.isFinite(long.expires_in) || (long.expires_in ?? 0) <= 0) throw new Error('token_exchange_failed');
  return { accessToken: long.access_token, expiresAt: new Date(Date.now() + long.expires_in! * 1000) };
}
