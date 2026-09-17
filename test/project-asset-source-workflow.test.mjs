import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runCompanyKb } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/company-kb.mjs';

const scripts = path.resolve('skills/ae-analysis/scripts/project-semantic-knowledge-wiki');
test('company discovery excludes personal KBs with the same name', async () => {
  const result = await runCompanyKb('+list', [], async () => ({ ok: true, data: [
    { name: 'Project', scope: 'personal' }, { name: 'Project', scope: 'company' },
  ] }));
  assert.deepEqual(result.data, [{ name: 'Project', scope: 'company' }]);
});

test('company creation denial is terminal without fallback or downstream requests', async () => {
  const calls = [];
  await assert.rejects(runCompanyKb('+new', ['--name', 'Project', '--project-id', '5'], async (args) => {
    calls.push(args); return { ok: false, error: { code: 'FORBIDDEN', message: 'Company creation denied' } };
  }), /FORBIDDEN/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(-2), ['--scope', 'company']);
});

test('schema and compilation preserve selected model and force company scope', async () => {
  for (const command of ['+schema', '+compile']) {
    let request;
    await runCompanyKb(command, ['--name', 'Project', '--model', 'system-model-glm-5.2'], async (args) => {
      request = args; return { ok: true, data: {} };
    });
    assert.equal(request[request.indexOf('--model') + 1], 'system-model-glm-5.2');
    assert.equal(request[request.indexOf('--scope') + 1], 'company');
  }
  await assert.rejects(runCompanyKb('+schema', ['--name', 'Project', '--scope=personal'], async () => assert.fail()), /overrides/);
  await assert.rejects(runCompanyKb('+schema', ['--name', 'Project', '--custom-instructions', 'rules'], async () => assert.fail()), /custom compiler/);
});

test('snapshot import is company scoped and does not accept compiler controls', async () => {
  let request;
  await runCompanyKb('+import', ['--name', 'Project', '--file', '/tmp/wiki.zip', '--project-id', '5'], async (args) => {
    request = args; return { ok: true, data: { requestId: 'req1', status: 'queued', scope: 'company' } };
  });
  assert.deepEqual(request.slice(0, 2), ['kb', '+import']);
  assert.equal(request[request.indexOf('--scope') + 1], 'company');
  assert.equal(request[request.indexOf('--file') + 1], '/tmp/wiki.zip');
  await assert.rejects(runCompanyKb('+import', ['--name', 'Project', '--file', '/tmp/wiki.zip', '--model', 'system-model-glm-5.2'], async () => assert.fail()), /does not run the KB compiler/);
  await assert.rejects(runCompanyKb('+import', ['--name', 'Project', '--file', '/tmp/wiki.zip'], async () => ({ ok: true, data: { scope: 'personal' } })), /did not return a company/);
  await assert.rejects(runCompanyKb('+import-status', ['--request-id', 'req1'], async () => ({ ok: true, data: { requestId: 'req1', status: 'succeeded', scope: 'personal' } })), /did not return a company/);
});

test('all retrieval refs are exact company refs', async () => {
  for (const command of ['+index', '+grep', '+read']) {
    let request;
    await runCompanyKb(command, ['--name', 'Project', '--host', 'https://example.test'], async (args) => {
      request = args; return { ok: true, data: {} };
    });
    const key = command === '+read' ? '--source' : '--sources';
    const ref = JSON.parse(request[request.indexOf(key) + 1]);
    assert.deepEqual(command === '+read' ? ref : ref[0], { scope: 'company', name: 'Project' });
  }
});

test('successful envelopes cannot hide a wrong scope or failed upload items', async () => {
  await assert.rejects(runCompanyKb('+new', ['--name', 'Project'], async () => ({
    ok: true, data: { scope: 'personal' },
  })), /did not return a company/);
  await assert.rejects(runCompanyKb('+add', ['--name', 'Project'], async () => ({
    ok: true, data: { result: { results: [{ status: 'failed' }], summary: { failed: 1 } } },
  })), /not completely successful/);
});

test('ZIP directory operations require a company-owned source and preserve revision conflicts', async () => {
  const args = ['--name', 'Project', '--id', 'zip1', '--path', 'assets/a.md', '--expected-revision', '7'];
  let calls = [];
  await assert.rejects(runCompanyKb('+source-put', args, async (request) => {
    calls.push(request); return { ok: true, data: { items: [] } };
  }), /not in the exact company/);
  assert.equal(calls.length, 1);
  calls = [];
  await assert.rejects(runCompanyKb('+source-put', args, async (request) => {
    calls.push(request);
    return calls.length === 1 ? { ok: true, data: { items: [{ id: 'zip1', sourceType: 'zip' }] } }
      : { ok: false, error: { code: 'SOURCE_CONTENT_REVISION_CONFLICT' } };
  }), /SOURCE_CONTENT_REVISION_CONFLICT/);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(-2), ['--scope', 'company']);
  assert.equal(calls[1][calls[1].indexOf('--expected-revision') + 1], '7');
});

test('prepared Wiki ZIP preserves content, excludes JSON and plans incremental changes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-zip-test-'));
  try {
    const make = (name, entries) => {
      const dir = path.join(root, name); fs.mkdirSync(dir);
      const sources = entries.map(([id, variant]) => {
        const file = `pskb-p5-${id}.md`;
        const content = `# Prepared Wiki ${id}\nSQL and authority evidence ${variant}.\n`;
        fs.writeFileSync(path.join(dir, file), content);
        return { file, display_name: file, title: `Report ${id}`, content_hash: createHash('sha256').update(content).digest('hex'), source_kind: 'report', asset_type: 'report', asset_key: id };
      });
      fs.writeFileSync(path.join(dir, 'kb-upload-manifest.json'), JSON.stringify({ manifest_kind: 'ae_project_semantic_kb_upload_sources', namespace: 'pskb-p5', semantic_project_id: 5, sources }));
      return dir;
    };
    const before = make('before', [['a','a'], ['b','b'], ['removed','c']]);
    const next = make('next', [['a','a'], ['b','d'], ['new','e']]);
    const run = (...args) => spawnSync(process.execPath, [path.join(scripts, 'package-wiki-source-zip.mjs'), '--source-dir', next, ...args], { encoding: 'utf8' });
    const archive = path.join(root, 'sources.zip');
    const first = run('--output', archive, '--previous-manifest', path.join(before, 'kb-upload-manifest.json'));
    assert.equal(first.status, 0, first.stderr);
    const plan = JSON.parse(first.stdout);
    assert.equal(plan.compile_mode, 'incremental');
    assert.ok(plan.unchanged.includes('sources/assets/reports/pskb-p5-report-report-a-a.md'));
    assert.deepEqual(plan.actions.map(a => a.action), ['replace', 'add', 'remove']);
    const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
    assert.equal(listing.status, 0); assert.doesNotMatch(listing.stdout, /\.json/);
    assert.equal(spawnSync('unzip', ['-p', archive, 'sources/assets/reports/pskb-p5-report-report-a-a.md'], { encoding: 'utf8' }).stdout, fs.readFileSync(path.join(next, 'pskb-p5-a.md'), 'utf8'));
    assert.equal(run('--output', archive).status, 1);
    assert.equal(run('--output', path.join(root, 'again.zip'), '--force').status, 0);
    assert.deepEqual(fs.readFileSync(archive), fs.readFileSync(path.join(root, 'again.zip')));
    assert.equal(JSON.parse(run('--previous-manifest', path.join(next, 'kb-upload-manifest.json'), '--force').stdout).compile_mode, 'skip');
    fs.unlinkSync(path.join(next, 'pskb-p5-a.md'));
    fs.symlinkSync(path.join(before, 'pskb-p5-a.md'), path.join(next, 'pskb-p5-a.md'));
    assert.notEqual(run('--output', path.join(root, 'escape.zip')).status, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('workflow keeps precompiled Markdown in the editable KB source lifecycle', () => {
  const doc = fs.readFileSync('skills/ae-analysis/references/project_semantic_knowledge_wiki.md', 'utf8');
  for (const text of [
    'company',
    'permission denial',
    'build-project-semantic-wiki.mjs',
    '--semantic-plan',
    '+schema',
    '+compile',
    'package-wiki-source-zip.mjs',
    'bare numeric IDs',
    '--description',
    '<project_name><asset_scope_label>项目语义知识库，用于辅助 Agent 在分析前召回业务域、资产口径、SQL 报表语义和治理边界。',
    'Do not mention temporary implementation details such as ZIP',
  ]) assert.ok(doc.includes(text), text);
  assert.doesNotMatch(doc, /Default to importing|Fallback: editable|Refresh: import/);
});
