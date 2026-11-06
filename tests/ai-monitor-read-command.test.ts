import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, stat, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Command as CommanderCommand } from 'commander';
import commands from '../src/commands/ai-monitor/index.js';
import { READ_COMMAND_SPECS } from '../src/commands/ai-monitor/read-command-specs.js';
import { buildReadInput } from '../src/commands/ai-monitor/read-shared.js';
import { buildAdvancedFilterInput } from '../src/commands/ai-monitor/advanced-filters.js';
import { buildTraceListInput, flattenTraceListResult } from '../src/commands/ai-monitor/trace/list.js';
import { buildTraceCountInput } from '../src/commands/ai-monitor/trace/count.js';
import { buildConversationGetInput } from '../src/commands/ai-monitor/conversation/get.js';
import { saveArchive, ensureNewArchivePath } from '../src/commands/ai-monitor/archive.js';
import { registerStandaloneAiMonitorCommands } from '../src/commands/ai-monitor/register.js';
import { registerCommands } from '../src/framework/register.js';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';
import type { RuntimeContext } from '../src/framework/types.js';

function context(values: Record<string, any>): RuntimeContext {
  return {
    has: name => Object.hasOwn(values, name), str: name => String(values[name] ?? ''),
    num: name => Number(values[name]), bool: name => values[name] === true,
    json: name => values[name], host: () => 'https://test.example.invalid',
  } as RuntimeContext;
}
const archiveBytes = Buffer.from('PK\x03\x04test-archive');
const archivePayload = () => ({ archive: {
  encoding: 'base64', media_type: 'application/zip', file_name: 'traces.zip',
  byte_length: archiveBytes.length, sha256: createHash('sha256').update(archiveBytes).digest('hex'),
  content_base64: archiveBytes.toString('base64'),
}, manifest: { complete: false, failures: [{ trace_id: 'missing', error: 'NOT_FOUND' }] } });

test('all read capabilities have stable three-segment IDs and typed command paths', () => {
  assert.equal(commands.length, 64);
  assert.equal(new Set(commands.map(command => command.capabilityId)).size, commands.length);
  assert.equal(new Set(commands.map(command => `${command.resource} ${command.command}`)).size, commands.length);
  for (const command of commands) {
    assert.match(command.capabilityId!, /^ai_monitor\.[a-z0-9_]+\.[a-z0-9_]+$/);
    assert.equal(command.risk, 'read');
    assert.equal(command.capabilityId, `ai_monitor.${command.resource!.replace(/-/g, '_')}.${command.command.replace(/-/g, '_')}`);
    assert.ok(command.flags.every(flag => flag.desc));
    assert.ok(command.validateInput && command.dryRun);
  }
});

test('advanced list/count flags preserve false, JSON trees and formal quality tags', () => {
  const filters = { id: 'root', type: 'group', logic: 'AND', conditions: [{ id: 'r1', type: 'rule', field: 'status_code', operator: 'eq', value: 'STATUS_CODE_ERROR' }] };
  const values = { 'filter-groups': filters, status: 'STATUS_CODE_ERROR', 'user-cancelled': false, 'quality-flags': ['l2_infra_instant_death'], 'last-days': 7, limit: 20, offset: 0, 'sort-by': 'start-time', 'sort-order': 'desc' };
  const expected = { filter_groups: filters, status: 'STATUS_CODE_ERROR', user_cancelled: false, quality_flags: ['l2_infra_instant_death'] };
  assert.deepEqual(buildAdvancedFilterInput(context(values)), expected);
  for (const build of [buildTraceListInput, buildTraceCountInput]) {
    const input = build(context(values));
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(input[key], value);
  }
  assert.throws(() => buildAdvancedFilterInput(context({ status: 'error' })), /must be one of/);
  assert.throws(() => buildAdvancedFilterInput(context({ 'quality-flags': ['startup_failure'] })), /unsupported/);
  assert.throws(() => buildAdvancedFilterInput(context({ 'quality-flags': [] })), /at least/);
  assert.throws(() => buildAdvancedFilterInput(context({ 'filter-groups': [] })), /group object/);
});

test('new output fields survive legacy list flattening', () => {
  const result = flattenTraceListResult({ schema_version: '1.1', limitations: ['PARTIAL'], data: {
    items: [{ trace_id: 't1', quality: { available: true, matched_flags: ['l1_slow'] }, recorded_costs: [{ unit: 'USD', amount: '0.123456789' }] }],
    page: { total: 1 }, new_metadata: { available: true },
  } }) as any;
  assert.equal(result.items[0].recorded_costs[0].amount, '0.123456789');
  assert.deepEqual(result.limitations, ['PARTIAL']);
  assert.equal(result.new_metadata.available, true);
  assert.equal(result.items[0].quality.available, true);
});

test('conversation spans are opt-in and preserve the legacy request without flags', () => {
  assert.deepEqual(buildConversationGetInput(context({ 'conversation-id': 'c1' })), { conversation_id: 'c1', data_token: 'AE-AGENT', report_source: '__default__' });
  assert.deepEqual(buildConversationGetInput(context({ 'conversation-id': 'c1', 'include-spans': true, 'span-limit': 3, 'span-offset': 2 })), { conversation_id: 'c1', data_token: 'AE-AGENT', report_source: '__default__', include_spans: true, span_limit: 3, span_offset: 2 });
});

test('new inputs validate cursor pairs, integers, report identity and mutually exclusive filters', () => {
  const spec = (id: string) => READ_COMMAND_SPECS.find(value => value.id === `ai_monitor.${id}`)!;
  assert.throws(() => buildReadInput(context({ 'before-issue-id': 'i1' }), spec('security.issues')), /provided together/);
  assert.throws(() => buildReadInput(context({ offset: 0.5 }), spec('diagnosis.queue')), /safe integer/);
  assert.throws(() => buildReadInput(context({ 'entity-type': 'trace' }), spec('diagnosis.report')), /entity-key/);
  assert.throws(() => buildReadInput(context({ 'task-id': 't1', 'after-ordinal': 2, 'trace-id': 'x1' }), spec('security.task_findings')), /cannot be combined/);
  assert.throws(() => buildReadInput(context({ 'trace-ids': [] }), spec('trace.export')), /at least/);
});

test('ZIP archives are private, verified, non-overwriting and keep partial manifests', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ai-monitor-archive-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = join(dir, 'data.zip');
  const result = await saveArchive(archivePayload(), output);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.deepEqual(await readFile(output), archiveBytes);
  assert.equal(result.manifest.complete, false);
  assert.ok(!JSON.stringify(result).includes('content_base64'));
  await assert.rejects(() => saveArchive(archivePayload(), output), /already exists/);
  assert.deepEqual(await readFile(output), archiveBytes);
  const link = join(dir, 'linked.zip');
  await symlink(output, link);
  await assert.rejects(() => ensureNewArchivePath(link), /already exists/);
  await assert.rejects(() => saveArchive(archivePayload(), link), /already exists/);
  for (const patch of [{ sha256: '0'.repeat(64) }, { byte_length: 1 }, { content_base64: '$invalid' }]) {
    const target = join(dir, `bad-${Object.keys(patch)[0]}.zip`);
    const payload = archivePayload(); Object.assign(payload.archive, patch);
    await assert.rejects(() => saveArchive(payload, target), /integrity/);
    await assert.rejects(() => stat(target), { code: 'ENOENT' });
  }
});

function requiredValue(field: { name: string; type: string; choices?: Array<string | number> }) {
  if (field.choices) return field.choices[0];
  if (field.name === 'models') return [{ model_key: 'model-1' }, { model_key: 'model-2' }];
  if (field.type === 'json') return ['id-1'];
  if (field.name === 'start') return '2026-11-01';
  if (field.name === 'end') return '2026-11-04';
  return 'id-1';
}

test('every new command dispatches through both registered entrypoints without losing payload fields', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ai-monitor-registration-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const host = 'https://ai-monitor-registration.example.invalid';
  setCliTokenManual('cli_ai_monitor_local_test', host);
  const originalFetch = globalThis.fetch;
  const originalWrite = process.stdout.write;
  let received: { path: string; body: any } | undefined;
  let output = '';
  globalThis.fetch = (async (url, init) => {
    const path = new URL(String(url)).pathname;
    received = { path, body: JSON.parse(String(init?.body)) };
    return Response.json({ ok: true, data: path.includes('.export/execute') ? archivePayload() : { marker: 'preserved', quality: { available: true }, future_field: { value: '1.234567890123' } }, meta: { request_id: 'local-test' } });
  }) as typeof fetch;
  process.stdout.write = ((chunk: any) => { output += String(chunk); return true; }) as typeof process.stdout.write;
  t.after(() => { globalThis.fetch = originalFetch; process.stdout.write = originalWrite; clearCliToken(host); });
  for (const spec of READ_COMMAND_SPECS) {
    const [, resource, action] = spec.id.split('.');
    const expected = { data_token: 'platform-key', report_source: 'demo' } as Record<string, unknown>;
    const args: string[] = [];
    for (const field of spec.fields) {
      if (field.required) {
        const value = requiredValue(field);
        expected[field.name.replace(/-/g, '_')] = value;
        args.push(`--${field.name}`, field.type === 'json' ? JSON.stringify(value) : String(value));
      } else if (field.default !== undefined) expected[field.name.replace(/-/g, '_')] = field.default;
    }
    for (const entry of ['ae-cli', 'ai-monitor']) {
      const program = new CommanderCommand().exitOverride()
        .option('--host <url>').option('--format <format>', '', 'json').option('--jq <expr>')
        .option('--validate', '', false).option('--dry-run', '', false).option('--yes', '', false);
      if (entry === 'ae-cli') registerCommands(program, commands); else registerStandaloneAiMonitorCommands(program, commands);
      received = undefined; output = '';
      const outputArgs = action === 'export' ? ['--output', join(dir, `${resource}-${entry}.zip`)] : [];
      await program.parseAsync(['node', entry, '--host', host, ...(entry === 'ae-cli' ? ['ai-monitor'] : []), resource.replace(/_/g, '-'), action.replace(/_/g, '-'), '--data-token', 'platform-key', '--report-source', 'demo', ...args, ...outputArgs]);
      assert.equal(received?.path, `/ai-monitor/api/cli/v1/capabilities/${spec.id}/execute`, spec.id);
      assert.deepEqual(received?.body.input, expected, `${entry} ${spec.id}`);
      const response = JSON.parse(output);
      if (action === 'export') {
        assert.ok(response.data.output_file);
        assert.ok(!output.includes('content_base64'));
      } else {
        assert.equal(response.data.future_field.value, '1.234567890123', spec.id);
        assert.equal(response.data.quality.available, true, spec.id);
      }
    }
  }
});

test('export validate and dry-run never create the destination file', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-monitor-export-preflight-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const host = 'https://ai-monitor-preflight.example.invalid';
  setCliTokenManual('cli_ai_monitor_local_test', host);
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = (async (url) => { paths.push(new URL(String(url)).pathname); return Response.json({ ok: true, data: { valid: true } }); }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; clearCliToken(host); });
  for (const id of ['ai_monitor.trace.export', 'ai_monitor.conversation.export']) {
    const command = commands.find(command => command.capabilityId === id)!;
    const output = join(directory, `${id}.zip`);
    const ctx = context({ 'trace-ids': ['t1'], 'conversation-ids': ['c1'], 'data-token': 'p1', 'report-source': 'demo', output });
    ctx.host = () => host;
    await command.validateInput!(ctx);
    await command.dryRun!(ctx);
    await assert.rejects(() => stat(output), { code: 'ENOENT' });
  }
  const capabilityPaths = paths.filter(path => path.includes('/capabilities/'));
  assert.equal(capabilityPaths.length, 4);
  assert.ok(capabilityPaths.every(path => path.endsWith('/validate') || path.endsWith('/dry-run')));
});
