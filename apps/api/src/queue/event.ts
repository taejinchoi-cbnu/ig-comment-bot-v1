import type { CommentEvent, MessageEvent } from '../webhook/normalize.ts';

/** Versioned, body-free SQS contract. Raw normalized events stay in webhook memory. */
export type QueuedCommentEvent = Omit<CommentEvent, 'text'> & { version: 1; triggerMatched: boolean };
export type QueuedMessageEvent = Omit<MessageEvent, 'text'> & { version: 1 };
export type QueuedBotEvent = QueuedCommentEvent | QueuedMessageEvent;

/** Explicit allowlist also strips unexpected runtime properties before persistence. */
export function serializeEvent(event: QueuedBotEvent): string {
  const common = { version: 1, kind: event.kind, igUserId: event.igUserId, igsid: event.igsid };
  return JSON.stringify(event.kind === 'COMMENT'
    ? { ...common, commentId: event.commentId, mediaId: event.mediaId,
        ...(event.username !== undefined ? { username: event.username } : {}), triggerMatched: event.triggerMatched }
    : { ...common, messageId: event.messageId });
}

/** Errors deliberately contain neither JSON input nor field values. */
export function parseEvent(body: string): QueuedBotEvent {
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new Error('Invalid queue JSON'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid queue event');
  const v = value as Record<string, unknown>;
  const string = (key: string) => typeof v[key] === 'string' && v[key].length > 0;
  if (v.version !== 1 || !string('igUserId') || !string('igsid')) throw new Error('Invalid queue event');
  const keys = ['version', 'kind', 'igUserId', 'igsid'];
  if (v.kind === 'COMMENT' && string('commentId') && string('mediaId')
      && typeof v.triggerMatched === 'boolean' && (v.username === undefined || typeof v.username === 'string')) {
    keys.push('commentId', 'mediaId', 'username', 'triggerMatched');
  } else if (v.kind === 'MESSAGE' && string('messageId')) {
    keys.push('messageId');
  } else { throw new Error('Invalid queue event'); }
  if (Object.keys(v).some(key => !keys.includes(key))) throw new Error('Unexpected queue fields');
  return v as QueuedBotEvent;
}
