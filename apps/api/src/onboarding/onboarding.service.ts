import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { OnboardingRequest, PrismaClient } from '../generated/prisma/client.ts';

export const ONBOARDING_PRISMA = Symbol('ONBOARDING_PRISMA');
export type OnboardingPrisma = Pick<PrismaClient, 'onboardingRequest'>;

export type PublicOnboardingRequest = Pick<
  OnboardingRequest,
  'id' | 'instagramUsername' | 'status' | 'createdAt' | 'updatedAt'
>;

function normalizeUsername(value: unknown): string {
  const username = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : '';
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    throw new BadRequestException('올바른 Instagram 아이디를 입력해주세요');
  }
  return username;
}

function publicRequest(request: OnboardingRequest): PublicOnboardingRequest {
  const { id, instagramUsername, status, createdAt, updatedAt } = request;
  return { id, instagramUsername, status, createdAt, updatedAt };
}

export class OnboardingService {
  private readonly prisma: OnboardingPrisma;

  constructor(prisma: OnboardingPrisma) {
    this.prisma = prisma;
  }

  async create(instagramUsername: unknown): Promise<PublicOnboardingRequest> {
    const request = await this.prisma.onboardingRequest.create({
      data: { instagramUsername: normalizeUsername(instagramUsername) },
    });
    return publicRequest(request);
  }

  async find(id: string): Promise<PublicOnboardingRequest> {
    const request = await this.prisma.onboardingRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('가입 요청을 찾을 수 없습니다');
    return publicRequest(request);
  }
}
