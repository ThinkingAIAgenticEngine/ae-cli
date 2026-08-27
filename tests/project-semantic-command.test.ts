/**
 * project-semantic command unit tests
 *
 * Run: npx tsx tests/project-semantic-command.test.ts
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import projectSemanticCommands from '../src/commands/project-semantic/index.ts';
import { projectSemanticCandidateSubmit } from '../src/commands/project-semantic/candidate/submit.ts';
import { projectSemanticReleasePublish } from '../src/commands/project-semantic/release/publish.ts';
import { projectSemanticAssetPackageExport } from '../src/commands/project-semantic/asset-package/export.ts';
import { projectSemanticCandidateValidate } from '../src/commands/project-semantic/candidate/validate.ts';
import { projectSemanticCandidateEnable } from '../src/commands/project-semantic/candidate/enable.ts';
import { projectSemanticEnable } from '../src/commands/project-semantic/enable.ts';
import { projectSemanticDeleteImpact } from '../src/commands/project-semantic/delete-impact.ts';
import { projectSemanticDelete } from '../src/commands/project-semantic/delete.ts';

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

function ctx(values: Record<string, unknown>, host = 'https://ta.example.com'): RuntimeContext {
  return {
    str(name: string): string {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    },
    num(name: string): number {
      return Number(values[name]);
    },
    optionalNum(name: string): number | undefined {
      const value = values[name];
      return value === undefined || value === null || value === '' ? undefined : Number(value);
    },
    bool(name: string): boolean {
      return Boolean(values[name]);
    },
    json(name: string): unknown {
      const value = values[name];
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    list: () => [],
    api: async () => ({}),
    communityReport: async () => ({}),
    localDataUpload: async () => ({}),
    querySql: async () => ({}),
    queryReportData: async () => ({}),
    token: async () => 'token',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'project-semantic',
    out: async () => undefined,
  };
}

async function dryInput(command: { dryRun?: (ctx: RuntimeContext) => unknown }, input: Record<string, unknown>) {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('project-semantic', { gatewayDomain: 'analysis' });
  const host = 'https://ta.example.com';
  setCliTokenManual('project-semantic-contract-test-token', host);
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_request: any, init?: RequestInit) => {
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await command.dryRun!(ctx(input, host));
    return body?.input ?? (result as any)?.body?.input;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

process.stdout.write('\nproject-semantic command tests\n');

await test('commands are registered under project-semantic service', () => {
  const commandNames = projectSemanticCommands.map((command) => `${command.resource ?? ''}:${command.command}`);
  assert.ok(commandNames.includes(':list'));
  assert.ok(commandNames.includes(':get'));
  assert.ok(commandNames.includes('asset-package:export'));
  assert.ok(commandNames.includes('candidate:validate'));
  assert.ok(commandNames.includes('candidate:submit'));
  assert.ok(commandNames.includes('candidate:enable'));
  assert.ok(commandNames.includes(':delete-impact'));
  assert.ok(commandNames.includes(':delete'));
  assert.ok(commandNames.includes('release:publish'));
});

await test('candidate validate accepts evidence-backed L2 semantics without a project-specific domain dictionary', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'project-semantic-validate-'));
  const assetPackage = join(temp, 'asset-package');
  const submitFile = join(temp, 'candidates.json');
  await mkdir(join(assetPackage, 'indexes'), { recursive: true });
  await writeFile(join(assetPackage, 'manifest.json'), JSON.stringify({
    schema_version: '1.0',
    package_kind: 'project_semantic_asset_package',
    project_id: 6,
    counts: { asset_directory_assets: 2 },
  }), 'utf8');
  await writeFile(join(assetPackage, '.asset-package.json'), JSON.stringify({
    snapshot_hash: 'retail-snapshot',
    project_id: 6,
  }), 'utf8');
  await writeFile(join(assetPackage, 'indexes', 'asset-directory.jsonl'), [
    JSON.stringify({ record_type: 'header', count: 2 }),
    JSON.stringify({
      evidence_id: 'collaborative_dashboard:12',
      resource_type: 'dashboard',
      resource_key: '12',
      title: '门店经营总览',
      authenticated: true,
    }),
    JSON.stringify({
      evidence_id: 'collaborative_report:18',
      resource_type: 'report',
      resource_key: '18',
      title: '成交门店数',
      authenticated: true,
    }),
    '',
  ].join('\n'), 'utf8');
  await writeFile(submitFile, JSON.stringify({
    topic_groups: [{
      topic_domain_key: 'store_operation',
      topic_domain_title: '门店经营',
      topic_group_key: 'store_metrics',
      topic_group_title: '门店指标',
      topic_group_reason: '两个认证资产共同区分门店覆盖与交易次数，影响经营分析的统计主体选择。',
      candidates: [{
        semantic_type: 'business_rule',
        title: '成交门店覆盖口径',
        summary: '成交门店覆盖按去重门店统计，不用交易次数替代门店数。',
        content: [
          '业务定义', '成交门店覆盖表示发生有效成交的去重门店范围。',
          '适用问题', '用于回答成交门店数量、覆盖变化和门店经营分布。',
          '判断与口径', '统计主体是门店；同一门店多笔交易只计一个成交门店。',
          'Agent 使用规则', '先确认问题询问门店覆盖还是交易规模，再选择对应资产。',
          '边界与例外', '不得用订单数或交易次数直接代表成交门店数。',
        ].join('\n'),
        recommendation_reason: '认证经营总览和成交门店报表共同支持门店去重口径，并揭示门店覆盖与交易规模不可互换。',
        resource_refs: [
          { asset_type: 'dashboard', asset_id: 'dashboard_12' },
          { asset_type: 'report', asset_id: 'report_18' },
        ],
      }],
    }],
  }), 'utf8');
  try {
    const result = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((result as any).passed, true);
    assert.equal((result as any).topic_domain_count, 1);
    assert.equal((result as any).candidate_count, 1);
    assert.equal((result as any).package_kind, 'structured_directory');
    assert.equal((result as any).snapshot_hash, 'retail-snapshot');
    assert.equal((result as any).topic_groups.length, 1);
    assert.equal((result as any).topic_groups[0].topic_domain_title, '门店经营');
    assert.equal((result as any).topic_groups[0].topic_group_key, 'store_metrics');
    assert.equal((result as any).topic_groups[0].topic_group_title, '门店指标');
    assert.equal((result as any).topic_groups[0].candidate_count, 1);
    assert.equal((result as any).topic_groups[0].candidates[0].title, '成交门店覆盖口径');
    assert.equal((result as any).topic_groups[0].candidates[0].resource_ref_count, 2);
    assert.deepEqual((result as any).errors, []);

    const missingGroupContract = JSON.parse(await readFile(submitFile, 'utf8'));
    delete missingGroupContract.topic_groups[0].topic_group_key;
    await writeFile(submitFile, JSON.stringify(missingGroupContract), 'utf8');
    const invalid = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((invalid as any).passed, false);
    assert.match((invalid as any).errors.join('\n'), /topic_group_key is required/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

await test('candidate validate accepts materialized structured asset package directories', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'project-semantic-structured-validate-'));
  const assetPackage = join(temp, 'asset-package');
  const submitFile = join(temp, 'candidates.json');
  await mkdir(join(assetPackage, 'indexes'), { recursive: true });
  await writeFile(join(assetPackage, 'manifest.json'), JSON.stringify({
    schema_version: '1.0',
    package_kind: 'project_semantic_asset_package',
    project_id: 6,
    counts: { asset_directory_assets: 2 },
  }), 'utf8');
  await writeFile(join(assetPackage, '.asset-package.json'), JSON.stringify({
    snapshot_hash: 'structured-snapshot',
    project_id: 6,
  }), 'utf8');
  await writeFile(join(assetPackage, 'indexes', 'asset-directory.jsonl'), [
    JSON.stringify({ record_type: 'header', count: 2 }),
    JSON.stringify({
      evidence_id: 'collaborative_dashboard:12',
      resource_type: 'dashboard',
      resource_key: '12',
      title: '门店经营总览',
      authenticated: true,
    }),
    JSON.stringify({
      evidence_id: 'collaborative_report:18',
      resource_type: 'report',
      resource_key: '18',
      title: '成交门店数',
      authenticated: true,
    }),
    '',
  ].join('\n'), 'utf8');
  await writeFile(submitFile, JSON.stringify({
    topic_groups: [{
      topic_domain_key: 'store_operation',
      topic_domain_title: '门店经营',
      topic_group_key: 'store_metrics',
      topic_group_title: '门店指标',
      topic_group_reason: '经营总览和成交门店报表共同表达门店覆盖与交易规模的口径差异。',
      candidates: [{
        semantic_type: 'business_rule',
        title: '成交门店覆盖口径',
        summary: '成交门店覆盖按去重门店统计，不用交易次数替代门店数。',
        content: [
          '业务定义', '成交门店覆盖表示发生有效成交的去重门店范围。',
          '适用问题', '用于回答成交门店数量、覆盖变化和门店经营分布。',
          '判断与口径', '统计主体是门店；同一门店多笔交易只计一个成交门店。',
          'Agent 使用规则', '先确认问题询问门店覆盖还是交易规模，再选择对应资产。',
          '边界与例外', '不得用订单数或交易次数直接代表成交门店数。',
        ].join('\n'),
        recommendation_reason: '经营总览与成交门店报表共同支持按门店去重的覆盖口径。',
        resource_refs: [
          { resource_type: 'dashboard', resource_key: '12' },
          { asset_type: 'report', asset_id: 'report_18' },
        ],
      }],
    }],
  }), 'utf8');
  try {
    const result = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((result as any).passed, true);
    assert.equal((result as any).package_kind, 'structured_directory');
    assert.equal((result as any).snapshot_hash, 'structured-snapshot');
    assert.equal((result as any).authenticated_asset_count, 2);
    assert.equal((result as any).topic_groups[0].candidate_count, 1);
    assert.equal((result as any).topic_groups[0].candidates[0].evidence_assets[0].title, '门店经营总览');
    assert.deepEqual((result as any).errors, []);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

await test('candidate validate rejects titles already covered by the package semantic catalog', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'project-semantic-catalog-validate-'));
  const assetPackage = join(temp, 'asset-package');
  const submitFile = join(temp, 'candidates.json');
  await mkdir(join(assetPackage, 'indexes'), { recursive: true });
  await mkdir(join(assetPackage, 'catalog'), { recursive: true });
  await writeFile(join(assetPackage, 'manifest.json'), JSON.stringify({
    schema_version: '1.0', project_id: 6,
  }), 'utf8');
  await writeFile(join(assetPackage, '.asset-package.json'), JSON.stringify({
    snapshot_hash: 'catalog-snapshot', project_id: 6,
  }), 'utf8');
  await writeFile(join(assetPackage, 'indexes', 'asset-directory.jsonl'), [
    JSON.stringify({ record_type: 'header', count: 2 }),
    JSON.stringify({
      evidence_id: 'collaborative_dashboard:12', resource_type: 'dashboard',
      resource_key: '12', title: '门店经营总览', authenticated: true,
    }),
    JSON.stringify({
      evidence_id: 'collaborative_report:18', resource_type: 'report',
      resource_key: '18', title: '成交门店数', authenticated: true,
    }),
    '',
  ].join('\n'), 'utf8');
  await writeFile(join(assetPackage, 'catalog', 'published.jsonl'), [
    JSON.stringify({ record_type: 'header', count: 1 }),
    JSON.stringify({ semantic_id: 'semantic_1', title: '成交门店覆盖口径' }),
    '',
  ].join('\n'), 'utf8');
  await writeFile(submitFile, JSON.stringify({
    topic_groups: [{
      topic_domain_key: 'store_operation',
      topic_domain_title: '门店经营',
      topic_group_key: 'store_metrics',
      topic_group_title: '门店指标',
      topic_group_reason: '认证资产共同支持门店覆盖口径。',
      candidates: [{
        semantic_type: 'business_rule',
        title: '成交门店覆盖口径',
        summary: '成交门店覆盖按去重门店统计。',
        content: [
          '业务定义', '成交门店覆盖表示有效成交的去重门店范围。',
          '适用问题', '用于回答成交门店覆盖。',
          '判断与口径', '同一门店只计一次。',
          'Agent 使用规则', '选择门店去重资产。',
          '边界与例外', '不得用订单数替代门店数。',
        ].join('\n'),
        recommendation_reason: '经营总览与报表共同支持门店去重。',
        resource_refs: [
          { asset_type: 'dashboard', asset_id: '12' },
          { asset_type: 'report', asset_id: '18' },
        ],
      }],
    }],
  }), 'utf8');
  try {
    const result = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((result as any).passed, false);
    assert.equal((result as any).catalog_entry_count, 1);
    assert.match((result as any).errors.join('\n'), /duplicates an existing published semantic/);

    await rm(join(assetPackage, 'catalog', 'published.jsonl'));
    await writeFile(join(assetPackage, 'catalog', 'disabled.jsonl'), [
      JSON.stringify({ record_type: 'header', count: 1 }),
      JSON.stringify({ semantic_id: 'semantic_1', title: '成交门店覆盖口径' }),
      '',
    ].join('\n'), 'utf8');
    const disabledResult = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((disabledResult as any).passed, false);
    assert.match((disabledResult as any).errors.join('\n'), /duplicates an existing disabled semantic/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

await test('candidate validate reports batch shape without judging natural-language quality', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'project-semantic-invalid-'));
  const assetPackage = join(temp, 'asset-package');
  const submitFile = join(temp, 'candidates.json');
  await mkdir(join(assetPackage, 'indexes'), { recursive: true });
  await writeFile(join(assetPackage, 'manifest.json'), JSON.stringify({
    schema_version: '1.0',
    package_kind: 'project_semantic_asset_package',
    project_id: 8,
    counts: { asset_directory_assets: 2 },
  }), 'utf8');
  await writeFile(join(assetPackage, '.asset-package.json'), JSON.stringify({
    snapshot_hash: 'generic-snapshot',
    project_id: 8,
  }), 'utf8');
  await writeFile(join(assetPackage, 'indexes', 'asset-directory.jsonl'), [
    JSON.stringify({ record_type: 'header', count: 2 }),
    JSON.stringify({
      evidence_id: 'collaborative_dashboard:one',
      resource_type: 'dashboard',
      resource_key: 'one',
      authenticated: true,
    }),
    JSON.stringify({
      evidence_id: 'collaborative_report:two',
      resource_type: 'report',
      resource_key: 'two',
      authenticated: true,
    }),
    '',
  ].join('\n'), 'utf8');
  await writeFile(submitFile, JSON.stringify({
    topic_groups: [{
      topic_domain_key: 'generic',
      topic_domain_title: 'Other',
      topic_group_key: 'generic_metrics',
      topic_group_title: 'Business metrics',
      topic_group_reason: 'Candidates are grouped for an independent Agent quality review.',
      candidates: ['one', 'two'].map((assetId) => ({
        semantic_type: 'asset_semantics',
        title: `Asset ${assetId}`,
        summary: `Description for asset ${assetId}.`,
        content: `This candidate only lists authenticated asset ${assetId}.`,
        recommendation_reason: `Generated from authenticated asset ${assetId}.`,
        resource_refs: [{ asset_type: assetId === 'one' ? 'dashboard' : 'report', asset_id: assetId }],
      })),
    }],
  }), 'utf8');
  try {
    const result = await projectSemanticCandidateValidate.execute(ctx({
      'asset-package': assetPackage,
      'submit-file': submitFile,
    }));
    assert.equal((result as any).passed, true);
    assert.equal((result as any).one_candidate_per_asset, true);
    assert.deepEqual((result as any).errors, []);
    assert.deepEqual((result as any).warnings, []);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

await test('candidate submit forwards grouped recommendations', async () => {
  assert.deepEqual(await dryInput(projectSemanticCandidateSubmit, {
    'project-id': 6,
    'topic-groups': JSON.stringify([
      { domain: 'retention', candidates: [{ title: 'Active users' }] },
    ]),
    'snapshot-hash': 'abc',
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
  }), {
    project_id: 6,
    snapshot_hash: 'abc',
    topic_groups: [{ domain: 'retention', candidates: [{ title: 'Active users' }] }],
    request_id: 'cli_0123456789abcdef0123456789abcdef',
  });
});

await test('semantic lifecycle commands and candidate enable keep distinct contracts', async () => {
  const common = {
    'project-id': 6,
    'expected-version': 2,
    reason: 'Lifecycle correction',
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
  };
  assert.deepEqual(await dryInput(projectSemanticEnable, { ...common, 'semantic-id': 'semantic_1' }), {
    project_id: 6,
    semantic_id: 'semantic_1',
    expected_version: 2,
    reason: 'Lifecycle correction',
    request_id: common['request-id'],
  });
  assert.deepEqual(await dryInput(projectSemanticDeleteImpact, {
    'project-id': 6,
    'semantic-id': 'semantic_1',
  }), { project_id: 6, semantic_id: 'semantic_1' });
  assert.deepEqual(await dryInput(projectSemanticDelete, { ...common, 'semantic-id': 'semantic_1' }), {
    project_id: 6,
    semantic_id: 'semantic_1',
    expected_version: 2,
    reason: 'Lifecycle correction',
    request_id: common['request-id'],
  });
  assert.deepEqual(await dryInput(projectSemanticCandidateEnable, {
    'project-id': 6,
    'candidate-ids': '["candidate_1"]',
    'request-id': common['request-id'],
  }), {
    project_id: 6,
    candidate_ids: ['candidate_1'],
    request_id: common['request-id'],
  });
});

await test('release publish forwards explicit approved candidates', async () => {
  assert.deepEqual(await dryInput(projectSemanticReleasePublish, {
    'project-id': 6,
    'candidate-ids': '["candidate_1","candidate_2"]',
    'expected-release-version': 0,
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
  }), {
    project_id: 6,
    candidate_ids: ['candidate_1', 'candidate_2'],
    expected_release_version: 0,
    request_id: 'cli_0123456789abcdef0123456789abcdef',
  });
});

await test('asset package export forwards the structured package request', async () => {
  assert.deepEqual(await dryInput(projectSemanticAssetPackageExport, {
    'project-id': 6,
  }), {
    project_id: 6,
    asset_scope: 'governed',
  });
  assert.deepEqual(await dryInput(projectSemanticAssetPackageExport, {
    'project-id': 6,
    'asset-scope': 'collaborative',
  }), {
    project_id: 6,
    asset_scope: 'collaborative',
  });
});

await test('asset package export rejects an unknown scope before calling Common', async () => {
  await assert.rejects(() => dryInput(projectSemanticAssetPackageExport, {
    'project-id': 6,
    'asset-scope': 'private_assets',
  }), /asset-scope must be one of/);
});

if (fail > 0) {
  process.exitCode = 1;
}
