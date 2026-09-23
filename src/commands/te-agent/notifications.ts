import { openSync, closeSync, fstatSync, readSync } from 'node:fs';
import {
  buildCapabilityGatewayUrl,
  callCapabilityApi,
} from '../../core/capability-api.js';
import { CliValidationError } from '../../core/errors.js';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { resolveApprovalApiBaseUrl } from './approval-cli-client.js';

const invalidUnicode =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const PREVIEW =
  'Dry-run is a local preview with zero business requests, not a permission check. Reading never marks notifications as read. Retry a send with the same client-request-id and identical content.';
const flag = (
  name: string,
  desc: string,
  type: Flag['type'] = 'string',
  required = false,
  sensitive = false,
): Flag => ({ name, desc, type, required, sensitive });
const validId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 191 &&
  value.trim() === value &&
  !/[\x00-\x1f\x7f]/.test(value);
function ids(ctx: RuntimeContext, key: string): string[] {
  const value = ctx.json(key);
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 100 ||
    value.some((v) => !validId(v))
  )
    throw new CliValidationError(
      'Provide a JSON array of 1-100 non-empty user or notification IDs.',
    );
  return value;
}
function identifier(ctx: RuntimeContext): string {
  const value = ctx.str('notificationId');
  if (!validId(value))
    throw new CliValidationError(
      '--notification-id must be a non-empty ID of at most 191 characters.',
    );
  return encodeURIComponent(value);
}
function sendBody(ctx: RuntimeContext) {
  const title = ctx.str('title');
  if (!title.trim() || [...title].length > 200 || invalidUnicode.test(title))
    throw new CliValidationError(
      '--title must contain 1-200 Unicode characters.',
    );
  const hasBody = ctx.has?.('body') ?? !!ctx.str('body');
  const file = ctx.str('bodyFile');
  if (file && hasBody)
    throw new CliValidationError('Use either --body or --body-file, not both.');
  let body = ctx.str('body');
  if (file) {
    let descriptor: number | undefined;
    try {
      descriptor = openSync(file, 'r');
      if (!fstatSync(descriptor).isFile())
        throw new Error('Not a regular file');
      const bytes = Buffer.alloc(16385);
      let count = 0;
      while (count < bytes.length) {
        const n = readSync(
          descriptor,
          bytes,
          count,
          bytes.length - count,
          null,
        );
        if (!n) break;
        count += n;
      }
      if (count > 16384) throw new Error('Too large');
      body = new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, count),
      );
    } catch {
      throw new CliValidationError(
        '--body-file must be a readable UTF-8 text file of at most 16 KiB.',
      );
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
  }
  if (Buffer.byteLength(body) > 16384 || invalidUnicode.test(body))
    throw new CliValidationError(
      '--body must be valid Unicode text of at most 16 KiB.',
    );
  const format = ctx.str('bodyFormat') || 'text';
  if (!['text', 'markdown'].includes(format))
    throw new CliValidationError('--body-format must be text or markdown.');
  const key = ctx.str('clientRequestId');
  if (!/^[\x21-\x7e]{1,128}$/.test(key))
    throw new CliValidationError(
      '--client-request-id must contain 1-128 printable ASCII characters without spaces.',
    );
  return {
    to_user_ids: ids(ctx, 'toUserIds'),
    title,
    body,
    body_format: format,
    client_request_id: key,
  };
}
function query(ctx: RuntimeContext, mode: 'list' | 'count' | 'recipients') {
  const params = new URLSearchParams();
  if (mode !== 'count') {
    const limit = ctx.optionalNum('limit') ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new CliValidationError(
        '--limit must be an integer between 1 and 100.',
      );
    params.set('limit', String(limit));
    const cursor = ctx.str('cursor');
    if (cursor) {
      if (cursor.length > (mode === 'recipients' ? 191 : 2048))
        throw new CliValidationError('--cursor is too long.');
      params.set('cursor', cursor);
    }
  }
  if (mode === 'recipients') {
    if (ctx.str('query').length > 100)
      throw new CliValidationError('--query exceeds 100 characters.');
    if (ctx.str('query')) params.set('query', ctx.str('query'));
  } else {
    for (const key of ['source', 'type']) {
      const value = ctx.str(key);
      if (
        value &&
        (!/^[a-z][a-z0-9._-]*$/.test(value) ||
          value.length > (key === 'source' ? 64 : 128))
      )
        throw new CliValidationError(`--${key} is invalid.`);
      if (value) params.set(key, value);
    }
    for (const [key, name] of [
      ['createdFrom', 'created_from'],
      ['createdBefore', 'created_before'],
    ]) {
      const value = ctx.str(key);
      if (
        value &&
        (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
          !Number.isFinite(Date.parse(value)))
      )
        throw new CliValidationError(
          `${name} must be an ISO 8601 timestamp with a timezone.`,
        );
      if (value) params.set(name, value);
    }
    if (
      ctx.str('createdFrom') &&
      ctx.str('createdBefore') &&
      Date.parse(ctx.str('createdFrom')) >= Date.parse(ctx.str('createdBefore'))
    )
      throw new CliValidationError(
        '--created-from must be earlier than --created-before.',
      );
    if (mode === 'list') {
      const status = ctx.str('readStatus') || 'all';
      if (!['all', 'unread', 'read'].includes(status))
        throw new CliValidationError(
          '--read-status must be all, unread, or read.',
        );
      params.set('read_status', status);
    }
  }
  return params.toString() ? `?${params}` : '';
}
function command(
  name: string,
  description: string,
  flags: Flag[],
  method: 'GET' | 'POST',
  path: (ctx: RuntimeContext) => string,
  body?: (ctx: RuntimeContext) => Record<string, unknown>,
): Command {
  return {
    service: 'agent',
    resource: 'notification',
    command: name,
    description,
    helpText: PREVIEW,
    flags,
    risk: method === 'GET' ? 'read' : 'write',
    validate(ctx) {
      path(ctx);
      body?.(ctx);
    },
    dryRun(ctx) {
      const payload = body?.(ctx);
      return {
        method,
        url: buildCapabilityGatewayUrl(
          resolveApprovalApiBaseUrl(ctx.host()),
          'agent',
          path(ctx),
        ),
        ...(payload
          ? {
              body:
                name === 'send'
                  ? { ...payload, title: '[redacted]', body: '[redacted]' }
                  : payload,
            }
          : {}),
      };
    },
    execute(ctx) {
      return callCapabilityApi(
        ctx.host(),
        'agent',
        path(ctx),
        method,
        body?.(ctx),
        {
          apiBaseUrl: resolveApprovalApiBaseUrl(ctx.host()),
          retryOnInvalidTokenForbidden: false,
          retryOnUnauthorized: true,
        },
      );
    },
  };
}
const pagination = [
  flag('limit', 'Page size, 1-100 (default 20)', 'number'),
  flag('cursor', 'Opaque cursor from the previous response'),
];
const filters = [
  flag('source', 'Exact producer filter'),
  flag('type', 'Exact notification type filter'),
  flag('created-from', 'Inclusive ISO 8601 creation timestamp'),
  flag('created-before', 'Exclusive ISO 8601 creation timestamp'),
];
export const notificationRecipients = command(
  'recipients',
  'Find enabled recipients in your company, including yourself',
  [flag('query', 'Search by name or display name'), ...pagination],
  'GET',
  (ctx) => `notifications/recipients${query(ctx, 'recipients')}`,
);
export const notificationSend = command(
  'send',
  'Send an in-app user notification to explicit recipients',
  [
    flag(
      'to-user-ids',
      'Recipient user IDs as a JSON array, 1-100 entries',
      'json',
      true,
    ),
    flag(
      'title',
      'Notification title, up to 200 Unicode characters',
      'string',
      true,
      true,
    ),
    flag('body', 'Notification body, at most 16 KiB', 'string', false, true),
    flag(
      'body-file',
      'UTF-8 text file, mutually exclusive with --body',
      'string',
      false,
      true,
    ),
    flag('body-format', 'text (default) or markdown'),
    flag(
      'client-request-id',
      'Required stable idempotency key; reuse for identical retries',
      'string',
      true,
      true,
    ),
  ],
  'POST',
  () => 'notifications',
  sendBody,
);
export const notificationList = command(
  'list',
  'List your notifications without changing read state',
  [
    ...filters,
    ...pagination,
    flag('read-status', 'all (default), unread, or read'),
  ],
  'GET',
  (ctx) => `notifications${query(ctx, 'list')}`,
);
export const notificationGet = command(
  'get',
  'Read a notification and its opaque business data',
  [flag('notification-id', 'Notification ID', 'string', true)],
  'GET',
  (ctx) => `notifications/${identifier(ctx)}`,
);
export const notificationUnreadCount = command(
  'unread-count',
  'Count your visible unread notifications',
  filters,
  'GET',
  (ctx) => `notifications/unread-count${query(ctx, 'count')}`,
);
export const notificationMarkRead = command(
  'mark-read',
  'Mark only the specified notifications as read',
  [
    flag(
      'notification-ids',
      'Notification IDs as a JSON array, 1-100 entries',
      'json',
      true,
    ),
  ],
  'POST',
  () => 'notifications/read',
  (ctx) => ({ notification_ids: ids(ctx, 'notificationIds') }),
);
export const notificationCommands = [
  notificationRecipients,
  notificationSend,
  notificationList,
  notificationGet,
  notificationUnreadCount,
  notificationMarkRead,
];
