import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.ts';
import { HealthController } from './health.controller.ts';
import { LegalController } from './legal.controller.ts';
import { OnboardingModule } from './onboarding/onboarding.module.ts';
import { WebhookController } from './webhook/webhook.controller.ts';

@Module({
  imports: [AuthModule, OnboardingModule],
  controllers: [HealthController, LegalController, WebhookController],
})
export class AppModule {}
