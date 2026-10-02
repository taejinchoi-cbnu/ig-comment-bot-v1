import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

const SALT_BYTES = 16;
// OWASP Password Storage Cheat Sheet 의 Argon2id 최소 권장값.
const MEMORY_KIB = 19 * 1024;
const ITERATIONS = 2;
const PARALLELISM = 1;
const HASH_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(SALT_BYTES),
    parallelism: PARALLELISM,
    iterations: ITERATIONS,
    memorySize: MEMORY_KIB,
    hashLength: HASH_BYTES,
    outputType: 'encoded',
  });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2Verify({ password, hash });
}
