/**
 * capability-command + capability-routing unit tests
 *
 * Run: npx tsx tests/capability-command.test.ts
 */

import assert from 'node:assert/strict';
import { createCapabilityCommand } from '../src/core/capability-command.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { formatOutput } from '../src/framework/output.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
  resolveGatewayDomain,
} from '../src/core/capability-routing.ts';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function makeCtx(host = 'https://ta.example.com') {
  return {
    host: () => host,
    str: () => '',
    num: () => 1,
    bool: () => false,
    json: () => ({}),
  } as any;
}

process.stdout.write('\ncapability-command tests\n');

await test('resolveGatewayDomain uses registered cliService route', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  assert.equal(resolveGatewayDomain('metadata'), 'analysis');
});

await test('resolveGatewayDomain honors explicit override', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  assert.equal(resolveGatewayDomain('metadata', 'custom'), 'custom');
});

await test('resolveGatewayDomain honors service env override including root gateway', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_ANALYSIS = '';
  try {
    assert.equal(resolveGatewayDomain('analysis'), '');
  } finally {
    delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_ANALYSIS;
  }
});

await test('resolveGatewayDomain honors generic env override', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = 'custom';
  try {
    assert.equal(resolveGatewayDomain('metadata'), 'custom');
  } finally {
    delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  }
});

await test('resolveGatewayDomain env override beats call-site override (local Hermes)', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('engage-task', { gatewayDomain: 'engage' });
  process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = '';
  try {
    // engage commands pass gatewayDomain:'engage'; empty env must still force /api/cli/v1
    assert.equal(resolveGatewayDomain('engage-task', 'engage'), '');
  } finally {
    delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  }
});

await test('resolveGatewayDomain throws when cliService is not registered', () => {
  clearCapabilityGatewayRoutesForTest();
  assert.throws(
    () => resolveGatewayDomain('unknown'),
    /not registered for CLI service 'unknown'/,
  );
});

await test('createCapabilityCommand dry-run posts to gateway dry-run via routed domain', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  const host = 'https://test-cap-cmd-dry.internal';
  setCliTokenManual('cli-cmd-dry-token', host);

  let capturedUrl = '';
  let capturedBody: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    capturedUrl = String(input);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const cmd = createCapabilityCommand({
      cliService: 'metadata',
      resource: 'event',
      command: 'get',
      capabilityId: 'metadata.event.get',
      description: 'test',
      flags: [],
      risk: 'read',
      buildInput: () => ({ project_id: 1, event_name: 'login' }),
    });

    const result = await cmd.dryRun!(makeCtx(host));
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/metadata.event.get/dry-run'));
    assert.deepEqual(capturedBody, { input: { project_id: 1, event_name: 'login' } });
    assert.equal(result.dry_run, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('createCapabilityCommand validateInput posts to gateway validate via routed domain', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  const host = 'https://test-cap-cmd-validate.internal';
  setCliTokenManual('cli-cmd-validate-token', host);

  let capturedUrl = '';
  let capturedBody: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    capturedUrl = String(input);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { valid: true, normalized_input: { project_id: 1 } } }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    const cmd = createCapabilityCommand({
      cliService: 'metadata',
      resource: 'data-table',
      command: 'sql-write',
      capabilityId: 'metadata.data_table.sql_write',
      description: 'test',
      flags: [],
      risk: 'write',
      buildInput: () => ({ project_id: 1, operation: 'create', qp: { taSqlVo: { sql: 'select 1' } } }),
    });

    const result = await cmd.validateInput!(makeCtx(host));
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/metadata.data_table.sql_write/validate'));
    assert.deepEqual(capturedBody, {
      input: { project_id: 1, operation: 'create', qp: { taSqlVo: { sql: 'select 1' } } },
    });
    assert.equal(result.valid, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('createCapabilityCommand post-processes data and preserves gateway metadata', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://test-capability-command-meta.internal';
  clearCliToken(host);
  setCliTokenManual('cli-capability-command-token', host);

  const cmd = createCapabilityCommand({
    cliService: 'analysis',
    resource: 'adhoc',
    command: 'run',
    capabilityId: 'analysis.adhoc.run',
    description: 'test',
    flags: [],
    risk: 'read',
    buildInput: () => ({ project_id: 1 }),
    postProcess: (data) => ({ ...(data as object), processed: true }),
  });

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    data: { items: [] },
    meta: { request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_6' },
  }), { status: 200 })) as typeof fetch;

  try {
    const result = await cmd.execute(makeCtx(host));
    assert.deepEqual(JSON.parse(await formatOutput(result, 'json')), {
      ok: true,
      data: { items: [], processed: true },
      meta: { request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_6' },
    });
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('createCapabilityCommand assigns and announces request_id while dispatching', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://test-capability-command-request-id.internal';
  clearCliToken(host);
  setCliTokenManual('cli-capability-command-token', host);

  const cmd = createCapabilityCommand({
    cliService: 'analysis',
    resource: 'adhoc',
    command: 'run',
    capabilityId: 'analysis.adhoc.run',
    description: 'test',
    flags: [{
      name: 'request-id',
      type: 'string',
      required: false,
      desc: 'request id',
    }],
    risk: 'read',
    buildInput: () => ({ project_id: 1 }),
  });

  const prevFetch = globalThis.fetch;
  const prevStderrWrite = process.stderr.write;
  let stderr = '';
  let requestId = '';
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    requestId = body.input.request_id;
    assert.match(requestId, /^cli_[0-9a-f]{32}$/);
    assert.match(stderr, new RegExp(`dispatching capability=analysis\\.adhoc\\.run request_id=${requestId}`));
    return new Response(JSON.stringify({
      ok: true,
      data: { items: [] },
      meta: { request_id: requestId },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    await cmd.execute(makeCtx(host));
    assert.match(stderr, /^\[ae-cli\] dispatching capability=analysis\.adhoc\.run request_id=cli_[0-9a-f]{32}\n$/);
  } finally {
    globalThis.fetch = prevFetch;
    process.stderr.write = prevStderrWrite;
    clearCliToken(host);
  }
});

await test('createCapabilityCommand does not report a failed dispatch as submitted', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://test-capability-command-failed-dispatch.internal';
  clearCliToken(host);
  setCliTokenManual('cli-capability-command-token', host);

  const cmd = createCapabilityCommand({
    cliService: 'analysis',
    resource: 'adhoc',
    command: 'run',
    capabilityId: 'analysis.adhoc.run',
    description: 'test',
    flags: [{ name: 'request-id', type: 'string', required: false, desc: 'request id' }],
    risk: 'read',
    buildInput: () => ({ project_id: 1 }),
  });

  const prevFetch = globalThis.fetch;
  const prevStderrWrite = process.stderr.write;
  let stderr = '';
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  globalThis.fetch = (async () => {
    throw new Error('network unavailable');
  }) as typeof fetch;

  try {
    await assert.rejects(cmd.execute(makeCtx(host)), /network unavailable/);
    assert.match(stderr, /^\[ae-cli\] dispatching capability=analysis\.adhoc\.run request_id=cli_[0-9a-f]{32}\n$/);
    assert.doesNotMatch(stderr, /submitted/);
  } finally {
    globalThis.fetch = prevFetch;
    process.stderr.write = prevStderrWrite;
    clearCliToken(host);
  }
});

await test('createCapabilityCommand preserves caller-supplied request_id', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://test-capability-command-explicit-request-id.internal';
  const supplied = 'cli_0123456789abcdef0123456789abcdef';
  clearCliToken(host);
  setCliTokenManual('cli-capability-command-token', host);

  const cmd = createCapabilityCommand({
    cliService: 'analysis',
    resource: 'adhoc',
    command: 'run',
    capabilityId: 'analysis.adhoc.run',
    description: 'test',
    flags: [{ name: 'request-id', type: 'string', required: false, desc: 'request id' }],
    risk: 'read',
    buildInput: () => ({ project_id: 1, request_id: supplied }),
  });

  const prevFetch = globalThis.fetch;
  const prevStderrWrite = process.stderr.write;
  process.stderr.write = (() => true) as typeof process.stderr.write;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.input.request_id, supplied);
    return new Response(JSON.stringify({ ok: true, data: {}, meta: {} }), { status: 200 });
  }) as typeof fetch;

  try {
    await cmd.execute(makeCtx(host));
  } finally {
    globalThis.fetch = prevFetch;
    process.stderr.write = prevStderrWrite;
    clearCliToken(host);
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
