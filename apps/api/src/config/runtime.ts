import { loadSecrets } from './secrets.ts';
import { memoizeAsync } from '../lib/memoize-async.ts';
import '../env.ts';
import { hkdfSync } from 'node:crypto';

/**
 * 마스터 키를 얻습니다.
 *
 * 로컬/셀프호스팅에서는 `ops/deploy.env` 의 `MASTER_KEY`(base64)를 쓰고,
 * Lambda 에서는 Secrets Manager 로 갑니다 — `prisma/client.ts` 의 `DATABASE_URL`
 * 처리와 같은 규칙입니다. 한쪽만 env 폴백이 있으면 로컬에서 절반만 뜨는
 * 비대칭이 생깁니다.
 */

const MASTER_KEY_LENGTH = 32;

const masterKeyCache = memoizeAsync(async (): Promise<Buffer> => {
  const fromEnv = process.env.MASTER_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, 'base64');
    if (key.length !== MASTER_KEY_LENGTH) {
      // 값은 담지 않습니다. 길이만 알려줍니다.
      throw new Error(
        `MASTER_KEY 는 base64 로 인코딩된 ${MASTER_KEY_LENGTH}바이트여야 합니다 (디코드 길이: ${key.length})`,
      );
    }
    return key;
  }
  return (await loadSecrets()).masterKey;
});

export function getMasterKey(): Promise<Buffer> {
  return masterKeyCache.run();
}

/**
 * JWT 서명키는 별도 평문 설정으로 복제하지 않고 마스터 키에서 용도 분리해 파생합니다.
 * HKDF 의 info 문자열이 다르므로 이 키를 알아도 토큰 암호화 키를 역산할 수 없습니다.
 */
export async function getJwtSecret(): Promise<Buffer> {
  const masterKey = await getMasterKey();
  return Buffer.from(hkdfSync('sha256', masterKey, Buffer.alloc(0), 'ig-comment-bot/jwt/v1', 32));
}

/** 테스트 전용. */
export function resetMasterKeyCache(): void {
  masterKeyCache.reset();
}
