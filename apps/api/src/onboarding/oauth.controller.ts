import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getPrisma } from '../prisma/client.ts';
import { consumeOAuthState, exchangeCode, oauthConfig, OAUTH_COOKIE, startOAuth, startLoginOAuth } from './oauth.ts';
import { completeInstagramOAuth } from './complete.ts';
import { AuthService } from '../auth/auth.service.ts';
import { Inject } from '@nestjs/common';
import { SESSION_COOKIE } from '../auth/auth.guard.ts';

function cookie(req: Request, name: string): string | undefined {
  return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

@Controller('oauth/instagram')
export class OAuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get('start')
  async start(@Query('request') requestId: string | undefined, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    if (!requestId) return res.redirect('/connection-result?error=invalid_request');
    const result = await startOAuth(await getPrisma(), requestId);
    if ('error' in result) return res.redirect(`/connection-result?error=${result.error}`);
    res.cookie(OAUTH_COOKIE, result.browser, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600_000, path: '/oauth/instagram' });
    return res.redirect(result.url);
  }

  @Get('login')
  async login(@Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const result = await startLoginOAuth(await getPrisma());
    res.cookie(OAUTH_COOKIE, result.browser, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600_000, path: '/oauth/instagram' });
    return res.redirect(result.url);
  }

  @Get('callback')
  async callback(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const intent = await consumeOAuthState(await getPrisma(), query.state, cookie(req, OAUTH_COOKIE));
    res.clearCookie(OAUTH_COOKIE, { path: '/oauth/instagram', httpOnly: true, secure: true, sameSite: 'lax' });
    if (!intent) return res.redirect('/connection-result?error=state_invalid');
    const resultPath = intent.purpose === 'LOGIN' ? '/login' : '/connection-result';
    if (query.error || query.error_reason) return res.redirect(`${resultPath}?error=access_denied`);
    if (!query.code) return res.redirect(`${resultPath}?error=invalid_request`);
    try {
      const token = await exchangeCode(query.code, oauthConfig());
      const session = await completeInstagramOAuth(await getPrisma(), intent, token, this.auth);
      res.cookie(SESSION_COOKIE, session, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
      return res.redirect(intent.purpose === 'LOGIN' ? '/dashboard' : '/connection-result?status=connected');
    } catch (cause) {
      const known = ['permission_denied', 'account_mismatch', 'subscription_missing', 'account_not_connected', 'user_inactive'];
      const code = cause instanceof Error && known.includes(cause.message) ? cause.message : 'token_exchange_failed';
      return res.redirect(`${resultPath}?error=${code}`);
    }
  }
}
