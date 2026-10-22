import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const result = spawnSync(process.execPath, [
  '--import', 'tsx', 'src/index.ts', '--no-update-check', '--dry-run',
  'agent', 'resource-package', 'import', '--host', 'http://127.0.0.1:1',
  '--scope', 'personal', '--file', './resources.zip', '--no-wait',
], { encoding: 'utf8', timeout: 15_000 });
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(result.stdout).data.body.wait, false,
  '--no-wait must reach the resource-package workflow through the CLI parser');

const temporary = await mkdtemp(join(tmpdir(), 'ae-resource-package-cli-'));
const bytes = Buffer.from('test resource package');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const calls: string[] = [];
let scope = 'personal';
let kind = 'export';
const task = () => ({ id: 'task-1', kind, scope, status: 'queued' });
const server = createServer(async (request, response) => {
  const url = request.url!;
  const send = (data: unknown) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(data));
  };
  if (url.startsWith('/v1/ta/cli/token/')) {
    response.statusCode = 404; response.end(); return;
  }
  calls.push(`${request.method} ${url}`);
  if (request.headers['cli-token'] !== 'cli_test_resource_package') {
    response.statusCode = 401; send({ error: 'Missing fixture token' }); return;
  }
  if (url.startsWith('/agent/api/external/knowledge-bases/ask')) {
    send(request.method === 'POST' ? { executionId: 'ask-1', status: 'running' }
      : { executionId: 'ask-1', status: 'completed', answer: 'Fixture answer', sources: [] }); return;
  }
  if (url.endsWith('/artifact')) {
    response.setHeader('Content-Length', bytes.length);
    response.setHeader('ETag', '"fixture"');
    response.end(request.method === 'HEAD' ? undefined : bytes); return;
  }
  if (url.endsWith('/tasks') || url.endsWith('/retry') || url.endsWith('/confirm')) {
    send(task()); return;
  }
  if (url.endsWith('/tasks/task-1')) {
    send({ ...task(), status: 'succeeded', artifactAvailable: true, packageSha256: sha256 }); return;
  }
  if (url.endsWith('/uploads')) {
    send({ id: 'upload-1', scope, fileName: 'resources.zip', totalBytes: bytes.length,
      chunkBytes: bytes.length, totalChunks: 1, parts: [], status: 'uploading' }); return;
  }
  if (url.endsWith('/limits')) {
    send({ desktopUploadConcurrency: 1, uploadChunkRetries: 1 }); return;
  }
  if (url.endsWith('/chunks/0')) {
    for await (const _chunk of request) { /* Drain the upload body. */ }
    send({ partNumber: 0 }); return;
  }
  if (url.endsWith('/complete')) {
    send({ uploadId: 'upload-1', packageSha256: sha256, duplicateImport: null,
      preflight: { snapshotId: 'a'.repeat(64), status: 'ready', blockers: [], warnings: [], confirmations: [] } }); return;
  }
  response.statusCode = 404; send({ error: `Unexpected fixture request ${url}` });
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address() as { port: number };
const host = `http://127.0.0.1:${address.port}`;
const file = join(temporary, 'resources.zip');
await mkdir(join(temporary, '.ae-config'));
await writeFile(join(temporary, '.ae-config', 'cli-token.json'), JSON.stringify({
  url: host, token: 'cli_test_resource_package',
}));
await writeFile(file, bytes);

async function run(action: string, args: string[], prefix = ['agent', 'resource-package']) {
  calls.length = 0;
  const child = spawn(process.execPath, [
    '--import', 'tsx', 'src/index.ts', '--no-update-check',
    ...prefix, action, '--host', host, ...args,
  ], { env: { ...process.env, HOME: temporary, SANDBOX_RUNTIME_ROOT: temporary }, timeout: 15_000 });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const status = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject); child.on('close', resolve);
  });
  return { status, stdout, stderr };
}

try {
  for (scope of ['personal', 'company']) {
    for (const action of ['export', 'import', 'retry']) {
      kind = action === 'import' ? 'import' : 'export';
      const base = action === 'export'
        ? ['--scope', scope, '--roots', '[{"type":"skill","sourceId":"skill-1"}]']
        : action === 'import' ? ['--scope', scope, '--file', file] : ['--task-id', 'task-1'];
      for (const flag of [[], ['--no-wait', 'false'], ['--no-wait'], ['--no-wait', 'true']]) {
        const asynchronous = flag.length > 0 && flag[1] !== 'false';
        const output = join(temporary, `${scope}-${action}-${flag.join('-') || 'default'}.zip`);
        const args = [...base, ...flag];
        if (action === 'export' && !asynchronous) args.push('--output', output);
        const result = await run(action, args);
        assert.equal(result.status, 0, `${action}: ${result.stderr}`);
        const data = JSON.parse(result.stdout).data;
        assert.equal(data.status, asynchronous ? 'submitted' : action === 'export' ? 'downloaded' : 'completed');
        assert.equal(data.task.status, asynchronous ? 'queued' : 'succeeded');
        assert.equal(calls.some(call => call.startsWith('GET ') && call.includes('/tasks/')), !asynchronous);
        if (asynchronous) assert.ok(!calls.some(call => call.includes('/artifact')));
        if (action === 'export' && !asynchronous) assert.deepEqual(await readFile(output), bytes);
      }
    }
  }
  const roots = ['--scope', 'personal', '--roots', '[{"type":"skill","sourceId":"skill-1"}]'];
  for (const flag of [['--no-wait'], ['--no-wait', 'true']]) {
    const result = await run('export', [...roots, ...flag, '--output', join(temporary, 'forbidden.zip')]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--no-wait cannot be combined with --output/);
    assert.deepEqual(calls, [], 'invalid combinations must not create a remote task');
  }
  const invalid = await run('retry', ['--task-id', 'task-1', '--no-wait', 'invalid']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Invalid boolean for --no-wait/);
  assert.deepEqual(calls, []);
  // The other declarative no-wait consumer uses kebab-case RuntimeContext lookup.
  for (const flag of [[], ['--no-wait', 'false'], ['--no-wait']]) {
    const result = await run('+ask', ['--question', 'Fixture question', ...flag], ['kb']);
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout).data;
    if (flag.length === 1) {
      assert.equal(data.status, 'running');
      assert.equal(calls.length, 1);
    } else {
      assert.equal(data.answer, 'Fixture answer');
      assert.equal(calls.length, 2);
    }
  }
  console.log('resource package CLI tests passed (24 workflow cases and validation guards)');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await rm(temporary, { recursive: true, force: true });
}
