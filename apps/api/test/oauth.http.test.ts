import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OAuthController } from '../src/onboarding/oauth.controller.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { getPrisma } from '../src/prisma/client.ts';
import { completeInstagramOAuth } from '../src/onboarding/complete.ts';
import { consumeOAuthState, exchangeCode, oauthConfig, startOAuth, startLoginOAuth, type OAuthIntent } from '../src/onboarding/oauth.ts';

jest.mock('../src/onboarding/oauth.ts', () => ({
  ...jest.requireActual<typeof import('../src/onboarding/oauth.ts')>('../src/onboarding/oauth.ts'),
  startOAuth: jest.fn(), startLoginOAuth: jest.fn(), consumeOAuthState: jest.fn(), exchangeCode: jest.fn(), oauthConfig: jest.fn(),
}));
jest.mock('../src/onboarding/complete.ts', () => ({ completeInstagramOAuth: jest.fn() }));

let app: INestApplication;
const issueSession = jest.fn<AuthService['issueInstagramSession']>();
const intents: OAuthIntent[] = [{ purpose: 'LOGIN', requestId: null }, { purpose: 'CONNECT', requestId: 'request-1' }];
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(getPrisma).mockResolvedValue({} as Awaited<ReturnType<typeof getPrisma>>);
  jest.mocked(consumeOAuthState).mockResolvedValue(intents[0]!);
  jest.mocked(startOAuth).mockResolvedValue({ url: 'https://www.instagram.com/oauth/authorize?state=test', browser: 'browser-binding' });
  jest.mocked(startLoginOAuth).mockResolvedValue({ url: 'https://www.instagram.com/oauth/authorize?state=test', browser: 'browser-binding' });
  jest.mocked(oauthConfig).mockReturnValue({ appId: 'test-app', appSecret: 'test-secret', origin: 'https://example.test', redirectUri: 'https://example.test/oauth/instagram/callback' });
  jest.mocked(exchangeCode).mockResolvedValue({ accessToken: 'test-token', expiresAt: new Date('2027-01-01') });
  issueSession.mockResolvedValue('test-session');
  jest.mocked(completeInstagramOAuth).mockImplementation(async (_db, _intent, _token, auth) => auth.issueInstagramSession('user-1', 'account-1'));
  const module = await Test.createTestingModule({ controllers: [OAuthController], providers: [{ provide: AuthService, useValue: { issueInstagramSession: issueSession } }] }).compile();
  app = module.createNestApplication();
  await app.init();
});
afterEach(async () => { await app?.close(); });
const callback = (query: Record<string, string> = { state: 'test-state', code: 'test-code' }) => request(app.getHttpServer())
  .get('/oauth/instagram/callback').query(query).set('Cookie', 'ig_oauth_browser=browser-binding').expect(302).expect('Cache-Control', 'no-store');
function expectNoSession(headers: Record<string, unknown>) {
  expect(headers['set-cookie']).not.toEqual(expect.arrayContaining([expect.stringMatching(/^ig_session=/)]));
  expect(issueSession).not.toHaveBeenCalled();
}

test.each(['/oauth/instagram/login', '/oauth/instagram/start?request=request-1'])('starts %s with a ten-minute browser cookie', async path => {
  const result = await request(app.getHttpServer()).get(path).expect(302).expect('Cache-Control', 'no-store');
  expect(result.headers.location).toBe('https://www.instagram.com/oauth/authorize?state=test');
  expect(result.headers['set-cookie']).toEqual([expect.stringContaining('ig_oauth_browser=browser-binding; Max-Age=600; Path=/oauth/instagram;')]);
  expect(result.headers['set-cookie']?.[0]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
});
test('missing or uninvited connection request redirects without issuing cookies', async () => {
  for (const path of ['/oauth/instagram/start', '/oauth/instagram/start?request=request-1']) {
    jest.mocked(startOAuth).mockResolvedValue({ error: 'not_invited' });
    const result = await request(app.getHttpServer()).get(path).expect(302).expect('Cache-Control', 'no-store');
    expect(result.headers.location).toBe(path.includes('?') ? '/connection-result?error=not_invited' : '/connection-result?error=invalid_request');
    expect(result.headers['set-cookie']).toBeUndefined();
  }
});
test.each(intents)('$purpose success redirects by purpose and issues a secure seven-day session', async intent => {
  jest.mocked(consumeOAuthState).mockResolvedValue(intent);
  const result = await callback();
  expect(result.headers.location).toBe(intent.purpose === 'LOGIN' ? '/dashboard' : '/connection-result?status=connected');
  expect(consumeOAuthState).toHaveBeenCalledWith(expect.anything(), 'test-state', 'browser-binding');
  expect(completeInstagramOAuth).toHaveBeenCalledWith(expect.anything(), intent, expect.objectContaining({ accessToken: 'test-token' }), expect.anything());
  expect(issueSession).toHaveBeenCalledWith('user-1', 'account-1');
  expect(result.headers['set-cookie']).toEqual(expect.arrayContaining([
    expect.stringMatching(/^ig_oauth_browser=; Path=\/oauth\/instagram; Expires=Thu, 01 Jan 1970.*HttpOnly; Secure; SameSite=Lax$/),
    expect.stringMatching(/^ig_session=test-session; Max-Age=604800; Path=\/;.*HttpOnly; Secure; SameSite=Lax$/),
  ]));
});
test('invalid state returns connection error and never exchanges a token', async () => {
  jest.mocked(consumeOAuthState).mockResolvedValue(null);
  const result = await callback();
  expect(result.headers.location).toBe('/connection-result?error=state_invalid');
  expect(exchangeCode).not.toHaveBeenCalled();
  expectNoSession(result.headers);
});
test.each(intents)('$purpose cancellation and missing code redirect to the purpose-specific page', async intent => {
  jest.mocked(consumeOAuthState).mockResolvedValue(intent);
  for (const [query, error] of [[{ state: 'test-state', error: 'access_denied' }, 'access_denied'], [{ state: 'test-state' }, 'invalid_request']] as const) {
    const result = await callback(query);
    expect(result.headers.location).toBe(`${intent.purpose === 'LOGIN' ? '/login' : '/connection-result'}?error=${error}`);
    expectNoSession(result.headers);
  }
  expect(exchangeCode).not.toHaveBeenCalled();
});
test.each(intents)('$purpose token exchange failure never issues a session', async intent => {
  jest.mocked(consumeOAuthState).mockResolvedValue(intent);
  jest.mocked(exchangeCode).mockRejectedValue(new Error('private upstream detail'));
  const result = await callback();
  expect(result.headers.location).toBe(`${intent.purpose === 'LOGIN' ? '/login' : '/connection-result'}?error=token_exchange_failed`);
  expect(completeInstagramOAuth).not.toHaveBeenCalled();
  expectNoSession(result.headers);
});
test.each(intents)('$purpose maps known completion failures and hides unknown errors', async intent => {
  jest.mocked(consumeOAuthState).mockResolvedValue(intent);
  for (const reason of ['permission_denied', 'account_mismatch', 'subscription_missing', 'account_not_connected', 'user_inactive', 'private upstream detail']) {
    jest.mocked(completeInstagramOAuth).mockRejectedValueOnce(new Error(reason));
    const result = await callback();
    const error = reason === 'private upstream detail' ? 'token_exchange_failed' : reason;
    expect(result.headers.location).toBe(`${intent.purpose === 'LOGIN' ? '/login' : '/connection-result'}?error=${error}`);
    expectNoSession(result.headers);
  }
});
