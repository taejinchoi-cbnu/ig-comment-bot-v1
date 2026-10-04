import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './auth.guard.ts';
import { assertSameOrigin, AuthGuard, SESSION_COOKIE } from './auth.guard.ts';
import { AuthService } from './auth.service.ts';

type CredentialsBody = { email?: unknown; password?: unknown };

@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('signup')
  signup(@Body() body: CredentialsBody | null | undefined = {}) {
    return this.auth.signup(body ?? {});
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: CredentialsBody | null | undefined = {}) {
    return this.auth.login(body ?? {});
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() request: Request, @Res() response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    assertSameOrigin(request);
    response.clearCookie(SESSION_COOKIE, { path: '/' }).status(204).send();
  }
}
