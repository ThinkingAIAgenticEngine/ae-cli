import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  previewAgentBundle,
  createAgentShares,
  listAgentShares,
  acceptAgentShare,
  rejectAgentShare,
  previewAgentSubmission,
  listAgentShareRecipients,
} from '../src/commands/te-agent/agent-distribution.ts';
import { submitApprovalRequest } from '../src/commands/te-agent/approval-commands.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { PermissionError } from '../src/core/errors.ts';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://agent-distribution-test.invalid';
function context(values: Record<string, unknown> = {}): RuntimeContext {
  return {
    str: (key: string) => (typeof values[key] === 'string' ? values[key] : ''),
    num: (key: string) => Number(values[key] ?? 0),
    optionalNum: (key: string) => (values[key] === undefined ? undefined : Number(values[key])),
    json: (key: string) => values[key],
    host: () => host,
  } as RuntimeContext;
}

const originalFetch = globalThis.fetch;
const originalBasePath = process.env.TE_CLAUDE_BASE_PATH;
const originalPrefix = process.env.AE_API_PREFIX;
const originalRuntimeRoot = process.env.SANDBOX_RUNTIME_ROOT;
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-distribution-token-'));
const requests: Array<{ url: string; headers: Headers; method: string; body?: string }> = [];
try {
  fs.mkdirSync(path.join(runtimeRoot, '.ae-config'));
  fs.writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli_distribution_test' }),
  );
  process.env.SANDBOX_RUNTIME_ROOT = runtimeRoot;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  setCliTokenManual('cli_distribution_test', host);
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/'))
      return new Response(JSON.stringify({ return_code: 0 }));
    requests.push({
      url: String(url),
      headers: new Headers(init?.headers),
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
    });
    return new Response(
      JSON.stringify({ ok: true, data: { ready: true, summary: { skill_count: 10 } } }),
    );
  }) as typeof fetch;
  const ctx = context({ agentId: 'agent-1' });
  await previewAgentBundle.validate?.(ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(await previewAgentBundle.execute(ctx))), {
    ready: true,
    summary: { skill_count: 10 },
  });
  assert.equal(requests[0].url, `${host}/agent/api/cli/agent/v1/agents/agent-1/bundle-preview`);
  assert.equal(requests[0].headers.get('cli-token'), 'cli_distribution_test');
  assert.equal(requests[0].headers.get('Authorization'), null);
  assert.equal(requests[0].headers.get('X-Sandbox-Id'), null);
  assert.equal(requests[0].method, 'GET');

  const cases = [
    [
      listAgentShareRecipients,
      { query: 'Alice' },
      'GET',
      'recipients?limit=20&query=Alice',
      undefined,
    ],
    [
      createAgentShares,
      { agentId: 'agent-1', toUserIds: ['user-1', 'user-2'], clientRequestId: 'share-1' },
      'POST',
      'agents/agent-1/shares',
      { to_user_ids: ['user-1', 'user-2'], client_request_id: 'share-1' },
    ],
    [listAgentShares, {}, 'GET', 'shares?direction=received&limit=20', undefined],
    [
      listAgentShares,
      { direction: 'sent', status: 'pending', limit: 50, cursor: 'share+cursor' },
      'GET',
      'shares?direction=sent&limit=50&status=pending&cursor=share%2Bcursor',
      undefined,
    ],
    [
      acceptAgentShare,
      { shareId: 'share-1', expectedVersion: 0, clientRequestId: 'accept-1' },
      'POST',
      'shares/share-1/accept',
      { expected_version: 0, client_request_id: 'accept-1' },
    ],
    [
      rejectAgentShare,
      { shareId: 'share-1', expectedVersion: 2, clientRequestId: 'reject-1' },
      'POST',
      'shares/share-1/reject',
      { expected_version: 2, client_request_id: 'reject-1' },
    ],
    [
      previewAgentSubmission,
      { approvalRequestId: 'request-1' },
      'GET',
      'submissions/request-1/preview',
      undefined,
    ],
  ] as const;
  for (const [command, values, method, path, body] of cases) {
    const ctx = context(values);
    await command.validate?.(ctx);
    const count = requests.length;
    const dryRun = await command.dryRun?.(ctx);
    assert.equal(requests.length, count, 'dry-run must not send requests');
    assert.deepEqual(dryRun, {
      method,
      url: `${host}/agent/api/cli/agent/v1/${path}`,
      ...(body ? { body } : {}),
    });
    await command.execute(ctx);
    const sent = requests.at(-1)!;
    assert.equal(sent.url, `${host}/agent/api/cli/agent/v1/${path}`);
    assert.equal(sent.method, method);
    assert.equal(sent.headers.get('cli-token'), 'cli_distribution_test');
    if (body) assert.deepEqual(JSON.parse(sent.body!), body);
    assert.equal(command.risk, method === 'GET' ? 'read' : 'write');
  }
  for (const invalid of [
    [],
    ['user-1', 'user-1'],
    Array.from({ length: 51 }, (_, i) => `user-${i}`),
    [''],
    'user-1',
  ]) {
    assert.throws(
      () =>
        createAgentShares.validate?.(
          context({ agentId: 'agent-1', toUserIds: invalid, clientRequestId: 'create-1' }),
        ),
      /to-user-ids/,
    );
  }
  for (const expectedVersion of [undefined, -1, 0.5, 2_147_483_648]) {
    assert.throws(
      () =>
        acceptAgentShare.validate?.(
          context({ shareId: 'share-1', expectedVersion, clientRequestId: 'accept-1' }),
        ),
      /expected-version/,
    );
  }
  assert.throws(() => listAgentShares.validate?.(context({ direction: 'all' })), /direction/);
  assert.throws(() => listAgentShares.validate?.(context({ limit: 51 })), /limit/);
  assert.throws(() => listAgentShares.validate?.(context({ status: 'unknown' })), /status/);
  assert.throws(
    () => listAgentShareRecipients.validate?.(context({ query: 'a'.repeat(101) })),
    /query/,
  );
  const submission = context({
    approvalTypeId: 'agent.publish@1',
    resourceId: 'agent-1',
    reason: 'Publish the Agent',
    payload: { description: 'Company assistant' },
    clientRequestId: 'submit-1',
  });
  await submitApprovalRequest.validate?.(submission);
  await submitApprovalRequest.execute(submission);
  assert.equal(requests.at(-1)!.url, `${host}/agent/api/cli/approval/v1/requests`);
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    type_id: 'agent.publish@1',
    resource_id: 'agent-1',
    reason: 'Publish the Agent',
    payload: { description: 'Company assistant' },
    client_request_id: 'submit-1',
  });

  const batch = {
    items: [
      {
        to_user_id: 'user-1',
        outcome: 'created',
        item: { id: 'share-1', status: 'pending', optimistic_version: 0 },
      },
      { to_user_id: 'user-2', outcome: 'failed', status: 409, code: 'dependency_stale' },
      {
        to_user_id: 'user-3',
        outcome: 'pending_reused',
        item: { id: 'share-3', status: 'pending', optimistic_version: 0 },
      },
      {
        to_user_id: 'user-4',
        outcome: 'installed_reused',
        item: { id: 'share-4', status: 'accepted', optimistic_version: 2 },
      },
    ],
  };
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok: true, data: batch }), { status: 201 })) as typeof fetch;
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        await createAgentShares.execute(
          context({
            agentId: 'agent-1',
            toUserIds: ['user-1', 'user-2', 'user-3', 'user-4'],
            clientRequestId: 'partial-1',
          }),
        ),
      ),
    ),
    batch,
  );

  for (const outcome of ['accepted', 'accepted_reused']) {
    const expected = { outcome, item: { id: 'target-1', name: 'Assistant', scope: 'personal' } };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true, data: expected }))) as typeof fetch;
    const actual = await acceptAgentShare.execute(
      context({ shareId: 'share-1', expectedVersion: 0, clientRequestId: `accept-${outcome}` }),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
  }

  let calls = 0;
  for (const status of [403, 409]) {
    calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'version_conflict',
            message: 'State changed',
            hint: 'Refresh the share list',
          },
        }),
        { status },
      );
    }) as typeof fetch;
    await assert.rejects(
      () =>
        acceptAgentShare.execute(
          context({ shareId: 'share-1', expectedVersion: 0, clientRequestId: 'accept-1' }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof PermissionError || error instanceof CapabilityGatewayError);
        assert.equal(error.code, 'version_conflict');
        if (error instanceof CapabilityGatewayError)
          assert.equal(error.hint, 'Refresh the share list');
        return true;
      },
    );
    assert.equal(calls, 1, 'permission and business conflicts must not be retried');
  }

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'agent_bundle_blocked',
          message: 'Personal dependencies cannot be shared',
          hint: 'Remove private-mcp',
        },
        meta: {
          blockers: [{ code: 'personal_mcp', resource_id: 'mcp-1', resource_name: 'private-mcp' }],
        },
      }),
      { status: 400 },
    )) as typeof fetch;
  await assert.rejects(
    () => previewAgentBundle.execute(ctx),
    (error: unknown) => {
      assert.ok(error instanceof CapabilityGatewayError);
      assert.equal(error.code, 'agent_bundle_blocked');
      assert.equal(error.hint, 'Remove private-mcp');
      assert.equal(
        (error.meta?.blockers as Array<{ resource_id: string }>)[0].resource_id,
        'mcp-1',
      );
      return true;
    },
  );

  for (const alwaysUnauthorized of [false, true]) {
    calls = 0;
    const retriedBodies: string[] = [];
    globalThis.fetch = (async (url, init) => {
      if (String(url).includes('/v1/ta/cli/token/')) {
        assert.equal(new URL(String(url)).pathname, '/v1/ta/cli/token/renew');
        return new Response(JSON.stringify({ return_code: 0 }));
      }
      calls += 1;
      retriedBodies.push(String(init?.body));
      return calls === 1 || alwaysUnauthorized
        ? new Response(
            JSON.stringify({
              ok: false,
              error: { code: 'cli_token_invalid', message: 'CLI token expired' },
            }),
            { status: 401 },
          )
        : new Response(JSON.stringify({ ok: true, data: { outcome: 'accepted' } }));
    }) as typeof fetch;
    const operation = () =>
      acceptAgentShare.execute(
        context({ shareId: 'share-1', expectedVersion: 0, clientRequestId: 'accept-retry' }),
      );
    if (alwaysUnauthorized) await assert.rejects(operation);
    else assert.equal(((await operation()) as { outcome: string }).outcome, 'accepted');
    assert.equal(calls, 2, '401 must retry exactly once, including when the retry fails');
    assert.equal(
      retriedBodies[0],
      retriedBodies[1],
      'auth recovery must preserve the idempotency key and version',
    );
  }

  process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
  process.env.AE_API_PREFIX = '/gateway';
  assert.equal(
    (previewAgentBundle.dryRun?.(ctx) as { url: string }).url,
    `${host}/custom-agent/api/cli/agent/v1/agents/agent-1/bundle-preview`,
  );
  delete process.env.TE_CLAUDE_BASE_PATH;
  assert.equal(
    (previewAgentBundle.dryRun?.(ctx) as { url: string }).url,
    `${host}/gateway/api/cli/agent/v1/agents/agent-1/bundle-preview`,
  );
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;

  for (const args of [
    ['agent', 'share', 'create', '--help'],
    [
      '--host',
      host,
      'agent',
      'share',
      'create',
      '--agent-id',
      'agent-1',
      '--to-user-ids',
      '["user-1"]',
      '--client-request-id',
      'framework-1',
      '--dry-run',
    ],
    [
      '--host',
      host,
      'agent',
      'share',
      'accept',
      '--share-id',
      'share-1',
      '--expected-version',
      '0',
      '--client-request-id',
      'framework-2',
      '--dry-run',
    ],
  ]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    if (args.includes('--help')) assert.match(result.stdout, /--to-user-ids/);
    else {
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, true);
      assert.match(JSON.stringify(output), /client_request_id/);
      assert.doesNotMatch(result.stdout, /cli_distribution_test/);
    }
  }
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
  if (originalBasePath === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
  else process.env.TE_CLAUDE_BASE_PATH = originalBasePath;
  if (originalPrefix === undefined) delete process.env.AE_API_PREFIX;
  else process.env.AE_API_PREFIX = originalPrefix;
  if (originalRuntimeRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
  else process.env.SANDBOX_RUNTIME_ROOT = originalRuntimeRoot;
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
}
console.log('agent distribution command tests passed');
