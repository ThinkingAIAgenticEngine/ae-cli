import assert from 'node:assert/strict';
import test from 'node:test';
import { Command as CommanderCommand } from 'commander';

import { buildCapabilityGatewayUrl } from '../src/core/capability-api.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { findGatewayDomain, listCapabilityDiscoveryPrefixes } from '../src/core/capability-routing.js';
import commands from '../src/commands/ai-monitor/index.js';
import { registerStandaloneAiMonitorCommands } from '../src/commands/ai-monitor/register.js';
import { buildTraceGetInput } from '../src/commands/ai-monitor/trace/get.js';
import { buildTraceListInput, flattenTraceListResult } from '../src/commands/ai-monitor/trace/list.js';
import { buildTraceCountInput } from '../src/commands/ai-monitor/trace/count.js';
import { buildConversationListInput } from '../src/commands/ai-monitor/conversation/list.js';
import { buildConversationCountInput } from '../src/commands/ai-monitor/conversation/count.js';
import { buildConversationGetInput } from '../src/commands/ai-monitor/conversation/get.js';
import { prepareAiMonitorScope } from '../src/commands/ai-monitor/shared.js';
import { registerCommands } from '../src/framework/register.js';
import { formatOutput } from '../src/framework/output.js';
import type { RuntimeContext } from '../src/framework/types.js';

function context(values: Record<string, unknown>): RuntimeContext {
  const camelCase = (name: string) => name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
  return {
    has: (name) => Object.prototype.hasOwnProperty.call(values, camelCase(name)),
    str: (name) => String(values[camelCase(name)] ?? ''),
    num: (name) => Number(values[camelCase(name)]),
    optionalNum: (name) => values[camelCase(name)] === undefined ? undefined : Number(values[camelCase(name)]),
    bool: (name) => Boolean(values[camelCase(name)]),
    json: (name) => values[camelCase(name)],
    list: () => [],
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    host: () => 'https://ae.example.com',
    mcpUrl: () => undefined,
    service: () => 'ai-monitor',
    out: async () => undefined,
  };
}

test('registers read-only AI Monitor capabilities', () => {
  assert.deepEqual(commands.slice(0, 7).map((command) => command.capabilityId), [
    'ai_monitor.platform.list',
    'ai_monitor.trace.list',
    'ai_monitor.trace.count',
    'ai_monitor.trace.get',
    'ai_monitor.conversation.list',
    'ai_monitor.conversation.count',
    'ai_monitor.conversation.get',
  ]);
  assert.ok(commands.every((command) => command.risk === 'read'));
  assert.equal(findGatewayDomain('ai-monitor'), 'ai-monitor');
  assert.deepEqual(listCapabilityDiscoveryPrefixes('ai-monitor'), ['ai_monitor.']);
});

test('conversation commands map list filters and detail identifiers', () => {
  assert.equal(buildConversationListInput(context({
    platform: 'te-claude', environment: 'agent007', lastDays: 7, limit: 20, offset: 0,
    sortBy: 'trace-count', sortOrder: 'desc',
  })).sort_by, 'trace_count');
  assert.deepEqual(buildConversationGetInput(context({
    conversationId: 'conversation-1', platform: 'te-claude', environment: 'agent007',
  })), {
    conversation_id: 'conversation-1',
    data_token: 'te-claude',
    report_source: 'agent007',
  });
});

test('conversation count maps filters without pagination', () => {
  assert.deepEqual(buildConversationCountInput(context({
    platform: 'te-claude', environment: 'agent007',
    lastDays: 7, startDate: '2026-09-28', endDate: '2026-09-28', channel: 'web',
  })), {
    data_token: 'te-claude', report_source: 'agent007', last_days: 7,
    start_date: '2026-09-28', end_date: '2026-09-28', agent: undefined,
    channel: 'web', search: undefined,
  });
});

test('trace count maps the shared filters without pagination or sorting', () => {
  assert.deepEqual(buildTraceCountInput(context({
    dataToken: 'te_claude_hub_token',
    reportSource: 'agent007',
    lastDays: 7,
    startDate: '2026-09-01',
    endDate: '2026-09-23',
    agent: 'billing-agent',
    channel: 'web',
    search: 'trace-1',
  })), {
    data_token: 'te_claude_hub_token',
    report_source: 'agent007',
    last_days: 7,
    start_date: '2026-09-01',
    end_date: '2026-09-23',
    agent: 'billing-agent',
    channel: 'web',
    search: 'trace-1',
  });
});

test('trace list maps defaults and sort values to the gateway contract', () => {
  const input = buildTraceListInput(context({
    dataToken: 'AE-AGENT',
    reportSource: '__default__',
    lastDays: 7,
    limit: 20,
    offset: 0,
    sortBy: 'total-tokens',
    sortOrder: 'desc',
  }));
  assert.deepEqual(input, {
    data_token: 'AE-AGENT',
    report_source: '__default__',
    last_days: 7,
    start_date: undefined,
    end_date: undefined,
    agent: undefined,
    channel: undefined,
    search: undefined,
    limit: 20,
    offset: 0,
    sort_by: 'total_tokens',
    sort_order: 'desc',
  });
});

test('user-facing platform and environment flags map to the existing scope contract', () => {
  const input = buildTraceListInput(context({
    platform: 'te_claude_hub_token',
    environment: 'agent007',
    lastDays: 7,
    limit: 20,
    offset: 0,
    sortBy: 'start-time',
    sortOrder: 'desc',
  }));
  assert.equal(input.data_token, 'te_claude_hub_token');
  assert.equal(input.report_source, 'agent007');
});

test('friendly and raw scope flags cannot be mixed in either direction', async () => {
  const cases = [
    { platform: 'te-claude', reportSource: 'agent007' },
    { environment: 'agent007', dataToken: 'te_claude_hub_token' },
  ];
  for (const values of cases) {
    await assert.rejects(
      () => prepareAiMonitorScope(context(values), {
        data_token: 'AE-AGENT', report_source: '__default__', last_days: 7, limit: 20, offset: 0,
        sort_by: 'start_time', sort_order: 'desc',
      }),
      (error: unknown) => error instanceof Error && error.message.includes('either the friendly scope flags or the advanced compatibility flags'),
    );
  }
});

test('explicit empty scope values are not silently replaced by defaults', () => {
  const input = buildTraceListInput(context({
    dataToken: '',
    reportSource: '',
    lastDays: 7,
    limit: 20,
    offset: 0,
    sortBy: 'start-time',
    sortOrder: 'desc',
  }));
  assert.equal(input.data_token, '');
  assert.equal(input.report_source, '');
});

test('trace get maps the identifier and default scope exactly', () => {
  assert.deepEqual(buildTraceGetInput(context({
    traceId: 'trace-1',
    dataToken: 'AE-AGENT',
    reportSource: '__default__',
  })), {
    trace_id: 'trace-1',
    data_token: 'AE-AGENT',
    report_source: '__default__',
  });
});

test('an explicit report source is preserved as a concrete scope', () => {
  assert.equal(buildTraceListInput(context({
    dataToken: 'AE-AGENT',
    reportSource: 'production',
    lastDays: 7,
    limit: 20,
    offset: 0,
    sortBy: 'start-time',
    sortOrder: 'desc',
  })).report_source, 'production');
});

test('AI Monitor uses its deployed base path instead of the shared gateway domain', () => {
  assert.equal(
    buildCapabilityGatewayUrl(
      'https://ae.example.com',
      'ai-monitor',
      'capabilities/ai_monitor.trace.list/execute',
    ),
    'https://ae.example.com/ai-monitor/api/cli/v1/capabilities/ai_monitor.trace.list/execute',
  );
});

test('AI Monitor routing preserves versioned gateway URLs for other services', () => {
  assert.equal(
    buildCapabilityGatewayUrl('https://ae.example.com', 'metadata', 'capabilities', {}, 'v2'),
    'https://ae.example.com/api/cli/metadata/v2/capabilities',
  );
  assert.equal(
    buildCapabilityGatewayUrl('https://ae.example.com', '', 'capabilities', {}, 'v2'),
    'https://ae.example.com/api/cli/v2/capabilities',
  );
  assert.equal(
    buildCapabilityGatewayUrl('https://ae.example.com', 'ai-monitor', 'capabilities'),
    'https://ae.example.com/ai-monitor/api/cli/v1/capabilities',
  );
});

test('trace list keeps JSON semantics while exposing items for table output', () => {
  assert.deepEqual(flattenTraceListResult({
    schema_version: '1.0',
    data: {
      items: [{ trace_id: 'trace-1' }],
      page: { limit: 20, offset: 0 },
      consistency: 'BEST_EFFORT',
    },
  }), {
    items: [{ trace_id: 'trace-1' }],
    page: { limit: 20, offset: 0 },
    consistency: 'BEST_EFFORT',
    schema_version: '1.0',
  });
});

test('trace list renders through the shared table formatter', async () => {
  const output = await formatOutput(flattenTraceListResult({
    schema_version: '1.0',
    data: { items: [{ trace_id: 'trace-1', duration_seconds: 2 }] },
  }), 'table');
  assert.match(output, /trace_id/);
  assert.match(output, /trace-1/);
});

function addGlobalOptions(program: CommanderCommand): CommanderCommand {
  return program
    .option('--host <url>')
    .option('--format <format>', '', 'json')
    .option('--jq <expr>')
    .option('--validate', '', false)
    .option('--dry-run', '', false)
    .option('--yes', '', false);
}

async function captureRegisteredRequest(entry: 'ae-cli' | 'ai-monitor', lifecycle: 'dry-run' | 'execute') {
  const host = `https://${entry}-${lifecycle}.example.com`;
  const previousFetch = globalThis.fetch;
  const previousWrite = process.stdout.write;
  let request: { url: string; body: unknown } | undefined;
  setCliTokenManual('cli_ai_monitor_test', host);
  globalThis.fetch = (async (input, init) => {
    request = {
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    return Response.json({
      ok: true,
      data: lifecycle === 'dry-run'
        ? { dry_run: true }
        : { schema_version: '1.0', data: { items: [], page: {}, consistency: 'BEST_EFFORT' } },
      meta: { request_id: 'request-1' },
    });
  }) as typeof fetch;
  process.stdout.write = (() => true) as typeof process.stdout.write;

  try {
    const program = addGlobalOptions(new CommanderCommand().exitOverride());
    const lifecycleArgs = lifecycle === 'dry-run' ? ['--dry-run'] : [];
    if (entry === 'ae-cli') {
      registerCommands(program, commands);
      await program.parseAsync([
        'node', entry, '--host', host, ...lifecycleArgs,
        'ai-monitor', 'trace', 'list', '--data-token', 'AE-AGENT', '--report-source', '__default__',
      ]);
    } else {
      registerStandaloneAiMonitorCommands(program, commands);
      await program.parseAsync([
        'node', entry, '--host', host, ...lifecycleArgs,
        'trace', 'list', '--data-token', 'AE-AGENT', '--report-source', '__default__',
      ]);
    }
    assert.ok(request);
    return request;
  } finally {
    process.stdout.write = previousWrite;
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
}

test('both entrypoints dispatch the same dry-run capability request', async () => {
  const aeCli = await captureRegisteredRequest('ae-cli', 'dry-run');
  const standalone = await captureRegisteredRequest('ai-monitor', 'dry-run');
  assert.equal(new URL(aeCli.url).pathname, new URL(standalone.url).pathname);
  assert.match(new URL(aeCli.url).pathname, /\/dry-run$/);
  assert.deepEqual(aeCli.body, standalone.body);
});

test('both entrypoints dispatch the same execute capability request', async () => {
  const aeCli = await captureRegisteredRequest('ae-cli', 'execute');
  const standalone = await captureRegisteredRequest('ai-monitor', 'execute');
  assert.equal(new URL(aeCli.url).pathname, new URL(standalone.url).pathname);
  assert.match(new URL(aeCli.url).pathname, /\/execute$/);
  assert.deepEqual(aeCli.body, standalone.body);
});


test('Trace and Conversation lists preserve recorded-cost sorting and fee-unit semantics', () => {
  const ctx = context({ platform: 'te-claude', environment: 'demo', lastDays: 7, limit: 20, offset: 0, sortBy: 'recorded-costs', sortOrder: 'desc' });
  assert.equal(buildTraceListInput(ctx).sort_by, 'recorded_costs');
  assert.equal(buildConversationListInput(ctx).sort_by, 'recorded_costs');
  for (const resource of ['trace', 'conversation']) {
    const command = commands.find(command => command.resource === resource && command.command === 'list')!;
    assert.match(command.helpText!, /within fee-unit groups/);
    assert.match(command.helpText!, /does not sum across currencies/);
  }
});
