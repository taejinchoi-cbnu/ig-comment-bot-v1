import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './password.ts';

test('Argon2id 해시는 salt를 포함하고 같은 비밀번호도 서로 다르게 저장한다', async () => {
  const [first, second] = await Promise.all([
    hashPassword('correct horse battery staple'),
    hashPassword('correct horse battery staple'),
  ]);

  assert.match(first, /^\$argon2id\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});
