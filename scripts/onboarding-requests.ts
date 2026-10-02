import { getPrisma } from '../apps/api/src/prisma/client.ts';

const [command, requestId] = process.argv.slice(2);

async function main() {
  const prisma = await getPrisma();
  try {
    if (!command || command === 'list') {
      const requests = await prisma.onboardingRequest.findMany({
        select: { id: true, instagramUsername: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      console.table(requests);
      return;
    }

    if (command === 'invite' && requestId) {
      const request = await prisma.onboardingRequest.update({
        where: { id: requestId },
        data: { status: 'INVITED', errorCode: null },
        select: { id: true, instagramUsername: true, status: true },
      });
      console.log(`@${request.instagramUsername}: ${request.status} (${request.id})`);
      return;
    }

    throw new Error('사용법: pnpm onboarding [list | invite <request-id>]');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : '온보딩 요청 처리 실패');
  process.exitCode = 1;
});
