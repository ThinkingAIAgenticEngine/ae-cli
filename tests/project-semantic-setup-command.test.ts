import { projectSemanticAssetPackageExport } from '../src/commands/project-semantic/asset-package/export.ts';
import { projectSemanticSetup } from '../src/commands/project-semantic/setup.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const host = 'https://semantic-setup.example.test';
function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: () => undefined,
    bool: () => false,
    json: (name) => values[name],
    list: () => [],
    host: () => host,
    out: async () => {},
  } as RuntimeContext;
}
async function fixture(
  run: (root: string, calls: { capability: string; input: Record<string, unknown> }[]) => Promise<void>,
  response?: (capability: string, data: unknown) => Response,
) {
  const root = await mkdtemp(resolve(tmpdir(), 'semantic-setup-'));
  const calls: { capability: string; input: Record<string, unknown> }[] = [];
  const previous = globalThis.fetch;
  setCliTokenManual('setup-test-token', host);
  globalThis.fetch = (async (url, init) => {
    const capability = String(url).match(/capabilities\/(.+)\/execute/)?.[1] || '';
    const input = JSON.parse(String(init?.body)).input;
    calls.push({ capability, input });
    if (capability === 'business_semantics.personal_context.list' && input.project_id === -1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'INVALID_SCOPE',
            message: 'Use global_personal_context for global scope',
          },
        }),
      );
    }
    const data = capability.endsWith('.list')
      ? { items: [], total: 0, complete: true, truncated: false }
      : { configured: false, markdown: '', revision: 0, can_manage: true };
    if (response) return response(capability, data);
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    await run(root, calls);
  } finally {
    globalThis.fetch = previous;
    clearCliToken(host);
  }
}

test('prepares a private materials-only workspace with full catalogs and never saves or marks use', async () => {
  await fixture(async (root, calls) => {
    const file = resolve(root, 'product.txt');
    await writeFile(file, 'Game product introduction');
    const output = resolve(root, 'setup');
    const result = await projectSemanticSetup.execute(
      context({
        'project-id': 5,
        'asset-scope': 'none',
        materials: [file],
        output,
      }),
    );
    assert.equal(result.status, 'evidence_ready');
    assert.equal(result.remote_writes, false);
    assert.equal(result.agent_synthesis_required, true);
    assert.deepEqual(
      calls.map((call) => call.capability),
      [
        'business_semantics.background.get',
        'business_semantics.background.get',
        'business_semantics.background.draft_get',
        'business_semantics.global_personal_context.list',
        'business_semantics.personal_context.list',
        'business_semantics.project_context.list',
      ],
    );
    assert.deepEqual(
      calls.map((call) => call.input.project_id),
      [0, 5, 5, -1, 5, 5],
    );
    assert.ok(calls.every((call) => call.input.mark_used === undefined));
    const sources = JSON.parse(await readFile(resolve(output, 'materials.json'), 'utf8'));
    assert.equal(sources[0].parse_status, 'not_read_by_agent');
    assert.match(sources[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal((await stat(output)).mode & 0o777, 0o700);
    assert.equal((await stat(resolve(output, 'context.json'))).mode & 0o777, 0o600);
    await assert.rejects(
      projectSemanticSetup.execute(
        context({
          'project-id': 5,
          'asset-scope': 'none',
          materials: [file],
          output,
        }),
      ),
      /already exists/,
    );
    assert.equal(calls.length, 6);
  });
});

test('reuses the existing exporter with exact setup scope and an isolated assets output', async () => {
  await fixture(async (root) => {
    const original = projectSemanticAssetPackageExport.execute;
    let seenScope = '',
      seenOutput = '';
    projectSemanticAssetPackageExport.execute = async (ctx) => {
      seenScope = ctx.str('asset-scope');
      seenOutput = ctx.str('output');
      await mkdir(seenOutput);
      await writeFile(
        resolve(seenOutput, 'manifest.json'),
        JSON.stringify({
          project_id: 5,
          asset_scope: seenScope,
          truncated: false,
        }),
      );
      return { output_path: seenOutput };
    };
    try {
      const output = resolve(root, 'setup');
      const result = await projectSemanticSetup.execute(context({ 'project-id': 5, output }));
      assert.equal(result.asset_scope, 'certified');
      assert.equal(seenScope, 'certified');
      assert.equal(seenOutput, resolve(output, 'assets'));
    } finally {
      projectSemanticAssetPackageExport.execute = original;
    }
  });
});

test('refuses missing evidence, invalid scope and unknown target before network activity', async () => {
  assert.throws(
    () =>
      projectSemanticSetup.validate!(
        context({
          'project-id': 5,
          output: '/tmp/example',
          'asset-scope': 'none',
        }),
      ),
    /Provide materials/,
  );
  assert.throws(
    () =>
      projectSemanticSetup.validate!(
        context({
          'project-id': 5,
          output: '/tmp/example',
          'asset-scope': 'governed',
        }),
      ),
    /asset-scope/,
  );
  assert.throws(() => projectSemanticSetup.validate!(context({ 'project-id': 0, output: '/tmp/example' })), /positive/);
});

test('stops at manager denial before collecting catalogs or creating a workspace', async () => {
  await fixture(
    async (root, calls) => {
      const output = resolve(root, 'denied');
      await assert.rejects(projectSemanticSetup.execute(context({ 'project-id': 5, output })), /denied/i);
      assert.equal(calls.length, 3);
      await assert.rejects(stat(output), { code: 'ENOENT' });
    },
    (capability, data) =>
      new Response(
        JSON.stringify(
          capability.endsWith('draft_get')
            ? {
                ok: false,
                error: { code: 'FORBIDDEN', message: 'Manager access denied' },
              }
            : { ok: true, data },
        ),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
});

test('refuses incomplete catalogs and preserves failed asset evidence for diagnosis', async () => {
  await fixture(
    async (root) => {
      const output = resolve(root, 'partial');
      await assert.rejects(
        projectSemanticSetup.execute(context({ 'project-id': 5, output })),
        /complete semantic catalog/,
      );
      await assert.rejects(stat(output), { code: 'ENOENT' });
    },
    (capability, data) =>
      new Response(
        JSON.stringify({
          ok: true,
          data: capability.endsWith('.list') ? { items: [], complete: false, truncated: true } : data,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
  await fixture(async (root) => {
    const original = projectSemanticAssetPackageExport.execute;
    projectSemanticAssetPackageExport.execute = async (ctx) => {
      await mkdir(ctx.str('output'));
      await writeFile(
        resolve(ctx.str('output'), 'manifest.json'),
        JSON.stringify({
          project_id: 99,
          asset_scope: 'certified',
          truncated: false,
        }),
      );
      return {};
    };
    try {
      const output = resolve(root, 'failed');
      await assert.rejects(projectSemanticSetup.execute(context({ 'project-id': 5, output })), /another project/);
      const state = JSON.parse(await readFile(resolve(output, 'setup.json'), 'utf8'));
      assert.equal(state.status, 'evidence_failed');
      assert.equal(state.failed_step, 'asset_export');
      assert.equal(state.remote_writes, false);
      assert.ok(await stat(resolve(output, 'context.json')));
    } finally {
      projectSemanticAssetPackageExport.execute = original;
    }
  });
});

test('validates specified references before any network request', () => {
  const values = {
    'project-id': 5,
    output: '/tmp/example',
    'asset-scope': 'specified',
  };
  assert.throws(() => projectSemanticSetup.validate!(context(values)), /asset-refs/);
  assert.throws(
    () =>
      projectSemanticSetup.validate!(
        context({
          ...values,
          'asset-refs': [{ resource_type: 'report', resource_key: 1 }],
        }),
      ),
    /resource_key/,
  );
  assert.doesNotThrow(() =>
    projectSemanticSetup.validate!(
      context({
        ...values,
        'asset-refs': [{ resource_type: 'report', resource_key: '1' }],
      }),
    ),
  );
});

test('rejects count mismatch and duplicate catalog identities before creating evidence', async () => {
  for (const catalog of [
    { items: [], total: 1, complete: true, truncated: false },
    {
      items: Array(2).fill({
        id: 'same',
        revision: 1,
        title: 'Rule',
        summary: 'Confirmed rule',
        keywords: [],
      }),
      total: 2,
      complete: true,
      truncated: false,
    },
  ]) {
    await fixture(
      async (root) => {
        const output = resolve(root, 'invalid');
        await assert.rejects(projectSemanticSetup.execute(context({ 'project-id': 5, output })), /catalog/i);
        await assert.rejects(stat(output), { code: 'ENOENT' });
      },
      (capability, data) =>
        new Response(
          JSON.stringify({
            ok: true,
            data: capability.endsWith('.list') ? catalog : data,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    );
  }
});

test('retains structured async identifiers without copying raw errors into the workspace', async () => {
  await fixture(async (root) => {
    const original = projectSemanticAssetPackageExport.execute;
    projectSemanticAssetPackageExport.execute = async () => {
      throw new CapabilityGatewayError('raw transport message', 'EXPORT_INTERRUPTED', undefined, undefined, {
        run_id: 'run_saved',
        artifact_id: 'artifact_saved',
        unrelated: 'not retained',
      });
    };
    try {
      const output = resolve(root, 'interrupted');
      await assert.rejects(projectSemanticSetup.execute(context({ 'project-id': 5, output })), /raw transport message/);
      const state = JSON.parse(await readFile(resolve(output, 'setup.json'), 'utf8'));
      assert.equal(state.run_id, 'run_saved');
      assert.equal(state.artifact_id, 'artifact_saved');
      assert.equal(state.status, 'evidence_failed');
      assert.equal(state.unrelated, undefined);
      assert.equal(state.message, undefined);
    } finally {
      projectSemanticAssetPackageExport.execute = original;
    }
  });
});
