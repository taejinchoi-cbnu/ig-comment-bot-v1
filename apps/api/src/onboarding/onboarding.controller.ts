import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.ts';

@Controller('api/onboarding/requests')
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboarding: OnboardingService) {}

  @Post()
  create(@Body() body: { instagramUsername?: unknown } | null | undefined = {}) {
    return this.onboarding.create(body?.instagramUsername);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.onboarding.find(id);
  }
}
