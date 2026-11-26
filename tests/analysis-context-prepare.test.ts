import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContextPrepareCommand } from '../src/commands/context/prepare.js';
import { businessForCommand } from '../src/core/businesses.js';
import type { RuntimeContext } from '../src/framework/types.js';

const row = (id: string, extra = {}) => ({ id, title: 'Payment amount', summary: 'Successful payments; excludes refunds.', keywords: ['payment amount'], revision: 1, expired: false, ...extra });
const catalog = (items: unknown[] = []) => ({ complete: true, total: items.length, items, truncated: false });
function context(values: Record<string, unknown> = {}, host = 'https://ta.example.com'): RuntimeContext {
  return {
    str: (name: string) => String(values[name] ?? ''),
    optionalNum: (name: string) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name: string) => values[name] === true,
    host: () => host,
  } as RuntimeContext;
}
async function fixture(run: (f: Awaited<ReturnType<typeof setup>>) => Promise<void>) {
  const f = await setup();
  try { await run(f); } finally { await rm(f.root, { recursive: true, force: true }); }
}
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'analysis-context-'));
  const state = { session: 'session-1' as string | undefined, identity: 'account-company-1',
    fail: '', partial: false, unsupported: false, personal: [] as ReturnType<typeof row>[],
    public: [row('semantic_2')], global: [row('preference_9')], background: { configured: true, markdown: 'Company product and analysis rules.' } };
  const calls: Array<{ host: string; capability: string; input: Record<string, unknown> }> = [];
  const command = createContextPrepareCommand({
    cacheRoot: () => root, session: () => state.session, identity: async () => state.identity,
    call: async (host, capability, input) => {
      calls.push({ host, capability, input });
      if (state.fail === capability) throw new Error('Permission denied');
      if (capability.endsWith('background.get')) return state.background;
      const rows = capability.endsWith('global_personal_context.list') ? state.global
        : capability.endsWith('project_context.list') ? state.public : state.personal;
      return { ...catalog(rows), complete: !state.partial,
        selection_policy: input.for_analysis_context && !state.unsupported ? 'ANALYSIS_CONTEXT' : 'ALL_VISIBLE' };
    },
  });
  return { root, state, calls, command, execute: (values = {}, host?: string) => command.execute(context(values, host)) };
}

test('global first, then project: published backgrounds, complete catalogs, no drafts or usage marks', async () => fixture(async (f) => {
  const global = await f.execute();
  assert.equal(global.phase, 'global');
  assert.deepEqual(f.calls.map((c) => [c.capability, c.input.project_id]), [
    ['business_semantics.background.get', 0], ['business_semantics.global_personal_context.list', -1],
  ]);
  assert.equal(global.total_source_entries, 1);
  const project = await f.execute({ 'project-id': 5 });
  assert.equal(project.global_cache_hit, true);
  assert.deepEqual(f.calls.slice(2).map((c) => [c.capability, c.input]), [
    ['business_semantics.background.get', { project_id: 5 }],
    ['business_semantics.personal_context.list', { project_id: 5, for_analysis_context: true }],
    ['business_semantics.project_context.list', { project_id: 5 }],
  ]);
  assert.equal(project.total_source_entries, 2);
  assert.equal(project.total_presented_entries, 2);
  assert.equal(project.items.some((r: any) => r.scope === 'project_personal'), false);
  const item = project.items.find((r: any) => r.scope === 'project_public');
  assert.equal(item.id, 'semantic_2');
  assert.ok(project.items.every((r: any) => !('aliases' in r)));
  assert.equal((await f.execute({ 'project-id': 5 })).cache_hit, true);
  assert.equal(f.calls.length, 5);
  const directory = join(f.root, (await readdir(f.root))[0]);
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  assert.equal((await stat(join(directory, 'global.json'))).mode & 0o777, 0o600);
}));

test('project-only invocation fills global first; identities, hosts, sessions and projects are isolated', async () => fixture(async (f) => {
  await f.execute({ 'project-id': 5 });
  assert.equal(f.calls.length, 5);
  await f.execute({ 'project-id': 6 });
  assert.equal(f.calls.length, 8);
  await f.execute({ 'project-id': 5 });
  assert.equal(f.calls.length, 8);
  for (const change of [() => { f.state.session = 'session-2'; }, () => { f.state.identity = 'other-account-company'; }]) {
    change(); await f.execute({ 'project-id': 5 });
  }
  assert.equal(f.calls.length, 18);
  await f.execute({ 'project-id': 5 }, 'https://other.example.com');
  assert.equal(f.calls.length, 23);
}));

test('CLI preserves all server-selected personal and project records without folding or aliases', async () => fixture(async (f) => {
  f.state.personal = [row('preference_1', { shared_id: 'semantic_2', differs: false })];
  const result = await f.execute({ 'project-id': 5 });
  assert.equal(result.total_source_entries, 3);
  assert.equal(result.total_presented_entries, 3);
  assert.deepEqual(result.items.filter((item: any) => item.kind === 'semantic').map((item: any) => item.id),
    ['preference_9', 'preference_1', 'semantic_2']);
  assert.ok(result.items.every((item: any) => !('aliases' in item)));
}));

test('an unsupported server cannot silently return the unfiltered personal directory', async () => fixture(async (f) => {
  f.state.unsupported = true;
  await assert.rejects(f.execute({ 'project-id': 5 }), /server must support analysis-context/);
  assert.equal(f.calls.some(call => call.capability.endsWith('project_context.list')), false);
}));

test('large catalogs are fully paged once from one cached snapshot without remote reloads', async () => fixture(async (f) => {
  f.state.global = Array.from({ length: 2000 }, (_, i) => row(`preference_${i}`, { summary: 'x'.repeat(100), expired: i === 0 }));
  const first = await f.execute();
  const items = [...first.items];
  assert.ok(first.remaining_pages > 0);
  for (let page = 2; page <= first.total_pages; page++) {
    const next = await f.execute({ page });
    items.push(...next.items);
    assert.equal(next.remaining_pages, first.total_pages - page);
  }
  assert.equal(items.filter((item: any) => item.kind === 'semantic').length, 2000);
  assert.equal(items[1].expired, true);
  assert.equal(new Set(items.slice(1).map((item: any) => item.id)).size, 2000);
  assert.equal(f.calls.length, 2);
}));

test('a thousand server-selected project records retain their own IDs across all pages', async () => fixture(async (f) => {
  f.state.personal = [];
  f.state.public = Array.from({ length: 1000 }, (_, i) => row(`semantic_${i}`));
  const first = await f.execute({ 'project-id': 5 });
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page++) {
    items.push(...(await f.execute({ 'project-id': 5, page })).items);
  }
  assert.equal(first.total_source_entries, 1001);
  assert.equal(first.total_presented_entries, 1001);
  const project = items.filter((item: any) => item.scope === 'project_public');
  assert.equal(project.length, 1000);
  assert.equal(new Set(project.map((item: any) => item.id)).size, 1000);
  assert.ok(project.every((item: any) => !('aliases' in item)));
  assert.equal(f.calls.length, 5);
}));

test('empty backgrounds are valid, while failed/partial preparations are never reused as complete', async () => fixture(async (f) => {
  f.state.background = { configured: false } as any;
  f.state.partial = true;
  await assert.rejects(f.execute(), /complete semantic catalog/);
  assert.deepEqual(await readdir(f.root), []);
  f.state.partial = false;
  f.state.fail = 'business_semantics.project_context.list';
  await assert.rejects(f.execute({ 'project-id': 5 }), /Permission denied/);
  const directory = join(f.root, (await readdir(f.root))[0]);
  assert.deepEqual(await readdir(directory), ['global.json']);
  f.state.fail = '';
  const result = await f.execute({ 'project-id': 5 });
  assert.equal(result.global_cache_hit, true);
  assert.equal(result.project_cache_hit, false);
  assert.equal(result.items[0].configured, false);
}));

test('missing sessions, invalid flags and missing pages fail before business reads; refresh is explicit', async () => fixture(async (f) => {
  f.state.session = undefined;
  await assert.rejects(f.execute(), (error: any) => error.code === 'ANALYSIS_CONTEXT_SESSION_REQUIRED');
  for (const value of [{ 'project-id': -1 }, { page: 0 }, { page: 2 }]) {
    await assert.rejects(f.execute({ 'session-id': 'explicit', ...value }));
  }
  assert.equal(f.calls.length, 0);
  f.state.session = 'session-1';
  await f.execute();
  f.state.global = [];
  assert.equal((await f.execute()).total_source_entries, 1);
  assert.equal((await f.execute({ refresh: true })).total_source_entries, 0);
  assert.equal(f.calls.length, 4);
  const directory = join(f.root, (await readdir(f.root))[0]);
  await writeFile(join(directory, 'global.json'), '{');
  await assert.rejects(f.execute(), /cache is unreadable/);
  assert.equal((await f.execute({ refresh: true })).cache_hit, false);
  assert.ok((await readFile(join(directory, 'global.json'), 'utf8')).includes('"version":2'));
}));

test('context preparation remains available with Agent business disabled; current-page context keeps its owner', () => {
  assert.equal(businessForCommand(['context']), undefined);
  assert.equal(businessForCommand(['context', 'prepare']), undefined);
  assert.equal(businessForCommand(['context', '+current']), 'agent');
});

test('a failed refresh cannot resurrect the old prepared project snapshot', async () => fixture(async (f) => {
  await f.execute({ 'project-id': 5 });
  f.state.fail = 'business_semantics.project_context.list';
  await assert.rejects(f.execute({ 'project-id': 5, refresh: true }), /Permission denied/);
  await assert.rejects(f.execute({ 'project-id': 5 }), /Permission denied/);
  const directory = join(f.root, (await readdir(f.root))[0]);
  assert.deepEqual(await readdir(directory), ['global.json']);
}));

test('old personal-preferred caches are reloaded without reusing their selection', async () => fixture(async (f) => {
  await f.execute({ 'project-id': 5 });
  const directory = join(f.root, (await readdir(f.root))[0]);
  const path = join(directory, 'project-5.json');
  const previous = JSON.parse(await readFile(path, 'utf8'));
  previous.version = 1;
  previous.personal = catalog([row('preference_1', { shared_id: 'semantic_2', differs: false })]);
  await writeFile(path, JSON.stringify(previous));
  const result = await f.execute({ 'project-id': 5 });
  assert.equal(result.global_cache_hit, true);
  assert.equal(result.project_cache_hit, false);
  assert.equal(result.items.some((item: any) => item.id === 'preference_1'), false);
  assert.equal(result.items.some((item: any) => item.id === 'semantic_2'), true);
  assert.equal(f.calls.length, 8);
}));
