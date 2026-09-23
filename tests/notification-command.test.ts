import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  notificationCommands,
  notificationSend,
  notificationList,
  notificationMarkRead,
} from '../src/commands/te-agent/notifications.ts';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.ts';
import { PermissionError } from '../src/core/errors.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
const host = 'https://notification-test.invalid';
const ctx = (values: Record<string, unknown> = {}): RuntimeContext =>
  ({
    str: (k: string) => (typeof values[k] === 'string' ? values[k] : ''),
    has: (k: string) => k in values,
    json: (k: string) => values[k],
    optionalNum: (k: string) =>
      values[k] === undefined ? undefined : Number(values[k]),
    host: () => host,
  }) as RuntimeContext;
const input = {
  toUserIds: ['recipient'],
  title: '通知标题',
  body: '通知正文',
  clientRequestId: 'stable-key',
};
const originalFetch = globalThis.fetch;
const originalRoot = process.env.SANDBOX_RUNTIME_ROOT;
const originalBase = process.env.TE_CLAUDE_BASE_PATH;
const root = mkdtempSync(path.join(tmpdir(), 'notification-cli-test-'));
let calls: Array<{ url: string; headers: Headers; body: string }> = [];
let statuses: number[] = [];
try {
  mkdirSync(path.join(root, '.ae-config'));
  writeFileSync(
    path.join(root, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'synthetic_notification_token' }),
  );
  process.env.SANDBOX_RUNTIME_ROOT = root;
  process.env.TE_CLAUDE_BASE_PATH = '/nested/agent';
  setCliTokenManual('synthetic_notification_token', host);
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/'))
      return new Response(JSON.stringify({ return_code: 0 }));
    calls.push({
      url: String(url),
      headers: new Headers(init?.headers),
      body: String(init?.body ?? ''),
    });
    const status = statuses.shift() ?? 200;
    return new Response(
      JSON.stringify(
        status === 200
          ? {
              ok: true,
              data: {
                notification: {
                  data: { camelCase: { nestedKey: 1 } },
                  actions: [],
                },
              },
            }
          : {
              ok: false,
              error: { code: 'test_failure', message: 'Synthetic failure' },
            },
      ),
      { status },
    );
  }) as typeof fetch;
  assert.equal(notificationCommands.length, 6);
  for (const command of notificationCommands)
    assert.equal(
      command.risk,
      ['send', 'mark-read'].includes(command.command) ? 'write' : 'read',
    );
  const preview = await notificationSend.dryRun!(ctx(input));
  assert.equal(calls.length, 0);
  assert.equal(preview.body.title, '[redacted]');
  assert.equal(preview.body.body, '[redacted]');
  const out = await notificationSend.execute(ctx(input));
  assert.deepEqual(JSON.parse(JSON.stringify(out.notification.data)), {
    camelCase: { nestedKey: 1 },
  });
  assert.equal(
    calls[0].url,
    `${host}/nested/agent/api/cli/agent/v1/notifications`,
  );
  assert.equal(
    calls[0].headers.get('cli-token'),
    'synthetic_notification_token',
  );
  assert.equal(calls[0].headers.get('authorization'), null);
  assert.deepEqual(JSON.parse(calls[0].body), {
    to_user_ids: ['recipient'],
    title: '通知标题',
    body: '通知正文',
    body_format: 'text',
    client_request_id: 'stable-key',
  });
  assert.equal(
    notificationSend.flags.find((f) => f.name === 'body')?.sensitive,
    true,
  );
  assert.equal(
    notificationSend.flags.find((f) => f.name === 'title')?.sensitive,
    true,
  );
  calls = [];
  statuses = [401, 200];
  await notificationSend.execute(ctx(input));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  for (const status of [403, 409, 429, 500]) {
    calls = [];
    statuses = [status];
    await assert.rejects(() => notificationSend.execute(ctx(input)));
    assert.equal(calls.length, 1);
  }
  calls = [];
  globalThis.fetch = (async () => {
    throw new Error('Network timeout');
  }) as typeof fetch;
  await assert.rejects(
    () => notificationSend.execute(ctx(input)),
    /Network timeout/,
  );
  for (const patch of [
    { title: ' ' },
    { title: 'x'.repeat(201) },
    { body: 'x'.repeat(16385) },
    { clientRequestId: '' },
    { toUserIds: [] },
    { toUserIds: Array(101).fill('x') },
    { bodyFormat: 'html' },
  ])
    assert.throws(() =>
      notificationSend.validate!(ctx({ ...input, ...patch })),
    );
  const file = path.join(root, 'body.txt');
  writeFileSync(file, '文件正文');
  assert.throws(() =>
    notificationSend.validate!(ctx({ ...input, bodyFile: file })),
  );
  const fileInput = { ...input, bodyFile: file };
  delete (fileInput as Partial<typeof input>).body;
  notificationSend.validate!(ctx(fileInput));
  writeFileSync(file, Buffer.from([0xff]));
  assert.throws(() => notificationSend.validate!(ctx(fileInput)));
  assert.throws(() =>
    notificationMarkRead.validate!(ctx({ notificationIds: [] })),
  );
  notificationList.validate!(ctx({ cursor: 'a'.repeat(2048) }));
  assert.throws(() =>
    notificationList.validate!(ctx({ cursor: 'a'.repeat(2049) })),
  );
  assert.throws(() =>
    notificationList.validate!(ctx({ readStatus: 'unknown' })),
  );
  console.log('Notification command contract: passed');
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
  if (originalRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
  else process.env.SANDBOX_RUNTIME_ROOT = originalRoot;
  if (originalBase === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
  else process.env.TE_CLAUDE_BASE_PATH = originalBase;
  rmSync(root, { recursive: true, force: true });
}
