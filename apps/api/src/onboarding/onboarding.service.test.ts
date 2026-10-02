import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { OnboardingRequest } from '../generated/prisma/client.ts';
import { OnboardingService, type OnboardingPrisma } from './onboarding.service.ts';

function request(overrides: Partial<OnboardingRequest> = {}): OnboardingRequest {
  return {
    id: 'request_1',
    instagramUsername: 'person.name',
    status: 'REQUESTED',
    errorCode: null,
    createdAt: new Date('2026-09-20T00:00:00Z'),
    updatedAt: new Date('2026-09-20T00:00:00Z'),
    ...overrides,
  };
}

function service() {
  const rows = new Map<string, OnboardingRequest>();
  const prisma = {
    onboardingRequest: {
      create: async ({ data }: { data: { instagramUsername: string } }) => {
        const row = request({ instagramUsername: data.instagramUsername });
        rows.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null,
    },
  } as unknown as OnboardingPrisma;
  return { onboarding: new OnboardingService(prisma), rows };
}

test('가입 요청은 Instagram 아이디를 정규화하고 본문이나 시크릿 없이 저장한다', async () => {
  const { onboarding, rows } = service();
  const created = await onboarding.create('  @Person.Name  ');
  assert.equal(created.instagramUsername, 'person.name');
  assert.equal(created.status, 'REQUESTED');
  assert.deepEqual(Object.keys(rows.get(created.id) ?? {}).sort(), [
    'createdAt', 'errorCode', 'id', 'instagramUsername', 'status', 'updatedAt',
  ]);
});

test('잘못된 Instagram 아이디와 존재하지 않는 요청을 거절한다', async () => {
  const { onboarding } = service();
  await assert.rejects(onboarding.create('bad name!'), BadRequestException);
  await assert.rejects(onboarding.find('missing'), NotFoundException);
});
