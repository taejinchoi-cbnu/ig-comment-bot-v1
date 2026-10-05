import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { serializeEvent, parseEvent, type QueuedBotEvent } from './event.ts';
import { EventProducer } from './producer.ts';
import type { SQSClient } from '@aws-sdk/client-sqs';

test('producer strips incoming bodies and unknown fields from both event kinds', async () => {
  const marker = 'PRIVATE_INCOMING_BODY';
  const events: QueuedBotEvent[] = [
    { version: 1, kind: 'COMMENT', igUserId: 'ig', igsid: 'u', commentId: 'c', mediaId: 'm', triggerMatched: false },
    { version: 1, kind: 'MESSAGE', igUserId: 'ig', igsid: 'u', messageId: 'mid' },
  ];
  const bodies: string[] = [];
  const client = { send: async (command: { input: { Entries: { Id: string; MessageBody: string }[] } }) => {
    bodies.push(...command.input.Entries.map(entry => entry.MessageBody));
    return { Successful: command.input.Entries.map(entry => ({ Id: entry.Id })) };
  } } as unknown as SQSClient;
  await new EventProducer({ queueUrl: 'https://example.com/queue', client }).enqueue(
    events.map(event => ({ ...event, text: marker, raw: marker })),
  );
  assert.equal(bodies.length, 2);
  for (const body of bodies) {
    assert.ok(!body.includes(marker));
    assert.ok(!Object.hasOwn(JSON.parse(body), 'text'));
    assert.deepEqual(parseEvent(body), events[bodies.indexOf(body)]);
  }
});

test('old, malformed and body-bearing queue events fail with safe errors', () => {
  const good = { version: 1, kind: 'COMMENT', igUserId: 'ig', igsid: 'u', commentId: 'c', mediaId: 'm', triggerMatched: true } as const;
  assert.deepEqual(parseEvent(serializeEvent(good)), good);
  for (const body of ['PRIVATE_INCOMING_BODY', 'null', JSON.stringify({ ...good, version: undefined }),
    JSON.stringify({ ...good, triggerMatched: undefined }), JSON.stringify({ ...good, text: 'PRIVATE_INCOMING_BODY' })]) {
    assert.throws(() => parseEvent(body), error => error instanceof Error && !error.message.includes('PRIVATE_INCOMING_BODY'));
  }
});
