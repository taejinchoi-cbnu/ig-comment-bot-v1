// Prisma CLI 전용 설정 (Prisma 7).
// 런타임 연결은 여기가 아니라 src/prisma/client.ts 의 어댑터가 담당합니다.
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// 시크릿은 repo 밖의 ops/ 에만 둡니다 (.gitignore).
loadEnv({ path: '../../ops/deploy.env' });

// Client generation is offline; migration commands still require an explicit operator URL.
const directUrl = process.env.DATABASE_URL_UNPOOLED;
if (!directUrl && !process.argv.includes('generate')) {
  throw new Error('DATABASE_URL_UNPOOLED is required for Prisma database commands');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // 마이그레이션은 PgBouncer 를 지원하지 않으므로 직결 URL 을 씁니다.
    // Prisma 6 의 directUrl 이 있던 자리입니다.
    url: directUrl || 'postgresql://example:example@127.0.0.1:5432/example',
  },
});
