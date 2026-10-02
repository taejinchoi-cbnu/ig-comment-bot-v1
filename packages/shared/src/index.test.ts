import assert from 'node:assert/strict';
import { test } from 'node:test';
import { instagramUsernameSchema } from './index.ts';

test('선행 @는 30자 Instagram 아이디 길이에 포함하지 않는다', () => {
  const username = 'a'.repeat(30);

  assert.equal(instagramUsernameSchema.parse(`@${username}`), username);
  assert.equal(instagramUsernameSchema.safeParse(`@${username}a`).success, false);
});
