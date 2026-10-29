import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import commands, { projectTargetGet, create, publicationCommands } from '../src/commands/te-kb/index.ts';
import { runCompanyKb } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/company-kb.mjs';
const ctx = (values) => ({ str: key => values[key] ?? '', json: key => values[key], host: () => 'https://example.test' });

test('merged KB registry and Skill retain project targeting and publication entrypoints', () => {
  for (const command of [projectTargetGet, ...publicationCommands]) {
    assert.equal(commands.filter(candidate => candidate === command).length, 1);
    const path = candidate => [candidate.service, candidate.resource, candidate.command].filter(Boolean).join(' ');
    assert.equal(commands.filter(candidate => path(candidate) === path(command)).length, 1);
  }
  const skill = readFileSync(new URL('../skills/ae-kb/SKILL.md', import.meta.url), 'utf8');
  const rows = skill.split('\n').filter(line => line.startsWith('| `'));
  for (const name of ['project-target get', '+ask-status']) {
    assert.equal(rows.filter(line => line.startsWith('| `' + name + '` |')).length, 1);
  }
  assert.match(rows.find(line => line.startsWith('| `+ask-status` |')), /--source-index/);
});

test('project target command is registered and uses the authoritative GET contract', () => {
  assert.ok(commands.includes(projectTargetGet));
  const input = ctx({ 'project-id': '5' });
  projectTargetGet.validate(input);
  assert.deepEqual(projectTargetGet.dryRun(input), { method: 'GET', url: 'https://example.test/agent/api/project-semantic-target', params: { projectId: '5' } });
  assert.throws(() => projectTargetGet.validate(ctx({ 'project-id': 'invalid' })), /valid/);
});

test('semantic creation presets the fixed business tag while ordinary and old calls remain unchanged', () => {
  const old = { scope: 'company', name: 'Business KB', tags: ['business'], projectId: '5' };
  assert.deepEqual(create.dryRun(ctx({ scope: 'company', name: 'Business KB', tags: ['business'], 'project-id': '5' })).body, old);
  const input = ctx({ scope: 'company', name: 'Semantic KB', purpose: 'project-semantic', tags: ['business', 'business'], 'project-id': '5' });
  create.validate(input);
  assert.deepEqual(create.dryRun(input).body.tags, ['项目语义', 'business']);
  assert.equal(create.dryRun(input).body.purpose, 'project-semantic');
  assert.throws(() => create.validate(ctx({ purpose: 'project-semantic', 'project-id': '5', tags: ['a', 'b'] })), /at most 2/);
  assert.throws(() => create.validate(ctx({ purpose: 'project-semantic', scope: 'personal', 'project-id': '5' })), /company scope/);
});

test('company workflow resolves through server and never falls back to list or a personal KB', async () => {
  const calls = [];
  for (const target of [{ state: 'available', item: { dbId: 'db', id: 'slug', scope: 'company', name: 'Semantic KB' } }, { state: 'restricted' }, { state: 'disabled' }, { state: 'multiple', reason: 'untagged' }, { state: 'multiple', reason: 'tag_conflict' }, { state: 'missing' }]) {
    const result = await runCompanyKb('+resolve', ['--project-id', '5', '--host', 'https://example.test'], async flags => { calls.push(flags); return { ok: true, data: target }; });
    assert.deepEqual(result.data, target);
  }
  assert.ok(calls.every(flags => flags.join(' ') === 'kb project-target get --project-id 5 --host https://example.test'));
  await assert.rejects(() => runCompanyKb('+resolve', ['--project-id', '5'], async () => ({ ok: false, error: { code: 'HTTP_404' } })), /stop without personal fallback/);
  await assert.rejects(() => runCompanyKb('+resolve', ['--project-id', '5'], async () => ({ ok: true, data: { state: 'available', item: { scope: 'personal', dbId: 'other' } } })), /identity/);
});

test('company workflow creation always passes explicit semantic purpose to server', async () => {
  const calls = [];
  await runCompanyKb('+new', ['--name', 'Semantic KB', '--project-id', '5'], async flags => { calls.push(flags); return { ok: true, data: { scope: 'company' } }; });
  assert.deepEqual(calls[0], ['kb', '+new', '--name', 'Semantic KB', '--project-id', '5', '--purpose', 'project-semantic', '--scope', 'company']);
  await assert.rejects(() => runCompanyKb('+new', ['--name', 'Semantic KB', '--project-id', '5'], async () => ({ ok: false, error: { code: 'forbidden' } })), /personal fallback/);
});

test('real CLI transports project target and semantic creation with CLI token only', async () => {
  const http = await import('node:http');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { spawn } = await import('node:child_process');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'semantic-target-cli-'));
  const requests = [];
  let status = 200;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'application/json');
    if (![ '/agent/api/project-semantic-target', '/agent/api/external/knowledge-bases/create' ].includes(url.pathname)) {
      res.end(JSON.stringify({ return_code: 0, data: { version: '6.1.0' } }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    requests.push({ url, method: req.method, headers: req.headers, body: body ? JSON.parse(body) : undefined });
    res.statusCode = status;
    res.end(JSON.stringify(status === 200 ? { state: 'multiple', reason: 'tag_conflict' } : { error: 'Endpoint not found' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  await fs.mkdir(path.join(root, '.ae-config'), { recursive: true });
  await fs.writeFile(path.join(root, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_fixture_project_target' }));
  const run = args => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', 'kb', ...args, '--host', host], { env: { ...process.env, SANDBOX_RUNTIME_ROOT: root }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  try {
    const result = await run(['project-target', 'get', '--project-id', '5']);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data, { state: 'multiple', reason: 'tag_conflict' });
    assert.equal(requests[0].method, 'GET');
    assert.equal(requests[0].url.searchParams.get('projectId'), '5');
    assert.equal(requests[0].headers['cli-token'], 'cli_fixture_project_target');
    assert.equal(requests[0].headers.authorization, undefined);
    const createResult = await run(['+new', '--name', 'Semantic KB', '--project-id', '5', '--purpose', 'project-semantic']);
    assert.equal(createResult.code, 0, createResult.stderr);
    assert.deepEqual(requests[1].body, { scope: 'company', name: 'Semantic KB', purpose: 'project-semantic', tags: ['项目语义'], projectId: '5' });
    status = 404;
    const missingApi = await run(['project-target', 'get', '--project-id', '5']);
    assert.notEqual(missingApi.code, 0);
    assert.equal(JSON.parse(missingApi.stderr).ok, false);
    assert.equal(requests.length, 3);
    assert.ok(requests.every(req => !req.url.pathname.endsWith('/list')));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
});
