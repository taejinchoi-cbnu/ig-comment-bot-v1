import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../config/runtime.ts';
import { getPrisma } from '../prisma/client.ts';
import { AuthController } from './auth.controller.ts';
import { AuthGuard } from './auth.guard.ts';
import { AUTH_PRISMA, AuthService } from './auth.service.ts';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: async () => ({
        secret: await getJwtSecret(),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_PRISMA, useFactory: getPrisma },
    {
      provide: AuthService,
      useFactory: (prisma: Awaited<ReturnType<typeof getPrisma>>, jwt: JwtService) =>
        new AuthService(prisma, jwt),
      inject: [AUTH_PRISMA, JwtService],
    },
    {
      provide: AuthGuard,
      useFactory: (auth: AuthService) => new AuthGuard(auth),
      inject: [AuthService],
    },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
