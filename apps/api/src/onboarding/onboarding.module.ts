import { Module } from '@nestjs/common';
import { getPrisma } from '../prisma/client.ts';
import { OnboardingController } from './onboarding.controller.ts';
import { OAuthController } from './oauth.controller.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { ONBOARDING_PRISMA, OnboardingService } from './onboarding.service.ts';

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController, OAuthController],
  providers: [
    { provide: ONBOARDING_PRISMA, useFactory: getPrisma },
    {
      provide: OnboardingService,
      useFactory: (prisma: Awaited<ReturnType<typeof getPrisma>>) => new OnboardingService(prisma),
      inject: [ONBOARDING_PRISMA],
    },
  ],
})
export class OnboardingModule {}
