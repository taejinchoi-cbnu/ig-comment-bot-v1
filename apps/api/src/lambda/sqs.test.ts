import { test, jest } from '@jest/globals';
import assert from 'node:assert/strict';
import type { SQSEvent } from 'aws-lambda';
import { handler } from './sqs.ts';

test('malformed and old SQS records fail individually without logging raw content', async () => {
  const logs: unknown[][] = [];
  const logger = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => logs.push(args));
  try {
    const event = { Records: [
      { messageId: 'malformed', body: 'PRIVATE_BODY invalid json' },
      { messageId: 'old', body: JSON.stringify({ kind: 'MESSAGE', text: 'PRIVATE_BODY', igUserId: 'ig', igsid: 'u', messageId: 'mid' }) },
      { messageId: 'extra', body: JSON.stringify({ version: 1, kind: 'MESSAGE', text: 'PRIVATE_BODY', igUserId: 'ig', igsid: 'u', messageId: 'mid' }) },
    ] } as SQSEvent;
    assert.deepEqual(await handler(event), { batchItemFailures: [
      { itemIdentifier: 'malformed' }, { itemIdentifier: 'old' }, { itemIdentifier: 'extra' },
    ] });
    assert.ok(!JSON.stringify(logs).includes('PRIVATE_BODY'));
    assert.equal(logs.length, 3);
  } finally { logger.mockRestore(); }
});
