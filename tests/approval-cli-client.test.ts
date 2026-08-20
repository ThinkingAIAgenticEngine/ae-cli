import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  getApprovalCli,
  postApprovalCli,
  resolveApprovalApiBaseUrl,
} from '../src/commands/te-agent/approval-cli-client.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { clearCliToken } from '../src/core/cli-token.ts';
import { PermissionError } from '../src/core/errors.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const originalFetch = globalThis.fetch;
const originalEnv = {
  HOME: process.env.HOME,
  SANDBOX_RUNTIME_ROOT: process.env.SANDBOX_RUNTIME_ROOT,
  TE_CLAUDE_BASE_PATH: process.env.TE_CLAUDE_BASE_PATH,
  AE_API_PREFIX: process.env.AE_API_PREFIX,
};
const host = 'http://platform.local';

function context(): RuntimeContext {
  return {
    str: () => '',
    num: () => 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'agent',
    out: async () => undefined,
  };
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-approval-token-'));
  fs.mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli_approval_test' }),
  );
  process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-approval-home-'));
  process.env.SANDBOX_RUNTIME_ROOT = runtimeRoot;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  clearCliToken(host);

  let capturedUrl = '';
  let capturedMethod = '';
  let capturedHeaders = new Headers();
  let capturedBody = '';
  let requestCount = 0;
  let responseStatus = 200;
  let responseBody: unknown = { ok: true, data: { items: [] } };
  let responseQueue: Array<{ status: number; body: unknown }> = [];
  const authRequestUrls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = String(input);
    if (requestUrl.includes('/v1/ta/cli/token/')) {
      authRequestUrls.push(requestUrl);
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    requestCount += 1;
    capturedUrl = requestUrl;
    capturedMethod = String(init?.method ?? 'GET');
    capturedHeaders = new Headers(init?.headers);
    capturedBody = String(init?.body ?? '');
    const queued = responseQueue.shift();
    return new Response(JSON.stringify(queued?.body ?? responseBody), {
      status: queued?.status ?? responseStatus,
    });
  }) as typeof fetch;

  await getApprovalCli(context(), 'requests?limit=20&status=pending');
  assert.equal(capturedUrl, `${host}/agent/api/cli/approval/v1/requests?limit=20&status=pending`);
  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedHeaders.get('cli-token'), 'cli_approval_test');
  assert.equal(capturedHeaders.get('Authorization'), null);
  assert.equal(capturedHeaders.get('X-Sandbox-Id'), null);
  assert.equal(capturedHeaders.get('X-Sandbox-Secret-Key'), null);
  assert.equal(capturedHeaders.get('Content-Type'), null);

  responseBody = { ok: true, data: { request: { id: 'request-1' } } };
  const result = await postApprovalCli(context(), 'requests', {
    type_id: 'skill.publish@1',
    resource_id: 'skill-1',
  });
  assert.equal(capturedUrl, `${host}/agent/api/cli/approval/v1/requests`);
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedHeaders.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(capturedBody), {
    type_id: 'skill.publish@1',
    resource_id: 'skill-1',
  });
  assert.equal((result as { request: { id: string } }).request.id, 'request-1');

  responseStatus = 409;
  requestCount = 0;
  responseBody = {
    ok: false,
    error: {
      type: 'api',
      code: 'approval_version_conflict',
      message: 'Approval state changed',
    },
  };
  await assert.rejects(
    () => postApprovalCli(context(), 'tasks/task-1/approve', {}),
    (error: unknown) => error instanceof CapabilityGatewayError
      && error.code === 'approval_version_conflict'
      && error.httpStatus === 409
      && error.message === 'Approval state changed',
  );
  assert.equal(requestCount, 1, 'business conflicts must not trigger an automatic retry');

  responseStatus = 403;
  requestCount = 0;
  const authRequestCountBeforeForbidden = authRequestUrls.length;
  responseBody = {
    ok: false,
    error: {
      type: 'permission',
      code: 'approval_permission_denied',
      message: 'Your token is invalid for this approval action',
    },
  };
  await assert.rejects(
    () => postApprovalCli(context(), 'tasks/task-1/reject', {}),
    (error: unknown) => error instanceof PermissionError
      && error.code === 'approval_permission_denied'
      && error.message === 'Your token is invalid for this approval action',
  );
  assert.equal(requestCount, 1, 'approval HTTP 403 responses must never trigger a retry');
  assert.equal(
    authRequestUrls.length,
    authRequestCountBeforeForbidden,
    'approval HTTP 403 responses must not trigger token refresh requests',
  );

  requestCount = 0;
  const authRequestCountBeforeUnauthorized = authRequestUrls.length;
  responseQueue = [
    {
      status: 401,
      body: {
        ok: false,
        error: { type: 'auth', code: 'cli_token_invalid', message: 'CLI token expired' },
      },
    },
    {
      status: 200,
      body: { ok: true, data: { task: { id: 'task-1' } } },
    },
  ];
  const refreshed = await postApprovalCli(context(), 'tasks/task-1/approve', {});
  assert.equal((refreshed as { task: { id: string } }).task.id, 'task-1');
  assert.equal(requestCount, 2, 'approval HTTP 401 responses may retry exactly once');
  const refreshAuthRequests = authRequestUrls.slice(authRequestCountBeforeUnauthorized);
  assert.ok(refreshAuthRequests.length <= 1, 'approval HTTP 401 may trigger at most one token renew');
  assert.ok(
    refreshAuthRequests.every((url) => new URL(url).pathname === '/v1/ta/cli/token/renew'),
    'approval HTTP 401 must not trigger token generation or validation side effects',
  );

  process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
  assert.equal(resolveApprovalApiBaseUrl(host), `${host}/custom-agent`);
  assert.equal(resolveApprovalApiBaseUrl(`${host}/custom-agent/`), `${host}/custom-agent`);
} finally {
  clearCliToken(host);
  restoreEnv();
  globalThis.fetch = originalFetch;
}

console.log('approval cli client tests passed');
