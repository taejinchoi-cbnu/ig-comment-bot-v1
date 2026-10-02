import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPrivacy } from './legal-page.ts';

test('privacy notice requires a configured email', () => {
  for (const email of [undefined, '', ' ', 'not-an-email']) assert.equal(renderPrivacy(email), null);
  assert.match(renderPrivacy('privacy@example.com')!, /privacy@example.com/);
});

test('privacy contact is HTML escaped and policy describes actual limitations', () => {
  const html = renderPrivacy('<operator>@example.com')!;
  assert.ok(!html.includes('<operator>'));
  assert.match(html, /&lt;operator&gt;@example.com/);
  assert.match(html, /Neon/);
  assert.match(html, /자동 삭제 API가 아닙니다/);
  assert.match(html, /본문 없이 이벤트 메타데이터/);
});
