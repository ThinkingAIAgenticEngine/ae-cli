import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/ae-cli.js', import.meta.url));

test('tracking plan write modes through the CLI entry point', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-plan-preview-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const draft = path.join(dir, 'draft.json');
  const xlsx = path.join(dir, 'draft.xlsx');
  const draftJson = JSON.stringify({ meta: { lang: 'en' } });
  await writeFile(draft, draftJson);
  await writeFile(xlsx, 'fixture');

  const requests = [];
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    requests.push(pathname);
    req.resume();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, data: { input_file_id: 'fixture', return_code: 0 } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const host = `http://127.0.0.1:${server.address().port}`;
  const run = (...args) => exec(process.execPath, [cli, '--no-update-check', '--host', host, ...args], {
    cwd: dir,
    env: { HOME: dir, PATH: process.env.PATH, AE_CLI_TOKEN_HOST: host, AE_CLI_TOKEN: 'cli_fixture' },
  });
  const plan = ['tracking', 'plan'];
  const del = [...plan, 'delete', '-p', '42'];
  const upload = [...plan, 'upload', '-p', '42', '--draft', draft, '--xlsx', xlsx];
  for (const [args, operations] of [
    [[...del, '--dry-run'], ['delete_entire_plan']],
    [['--dry-run', ...upload, '--replace', '--yes'], ['delete_entire_plan', 'upload_xlsx', 'save_plan']],
    [[...upload, '--dry-run'], ['upload_xlsx', 'save_plan']],
  ]) {
    const { stdout } = await run(...args);
    const { ok, data } = JSON.parse(stdout);
    assert.equal(ok, true);
    assert.equal(data.dry_run, true);
    assert.equal(data.project_id, 42);
    assert.equal(data.host, host);
    assert.deepEqual(data.operations, operations);
  }
  for (const cmd of [del, upload]) {
    await assert.rejects(run(...cmd, '--validate'), /--validate is not supported/);
    await assert.rejects(run(...cmd, '--validate', '--dry-run'), /Cannot combine/);
    const { stdout } = await run(...cmd, '--help');
    assert.match(stdout, /Local --dry-run preview/);
  }
  // CLI startup may read company feature flags even for a local preview.
  assert.deepEqual(requests.filter(url => url !== '/v1/ta/cli/config'), []);
  assert.equal(await readFile(draft, 'utf8'), draftJson);
  assert.equal(await readFile(xlsx, 'utf8'), 'fixture');

  // Exercise the existing execution contract against the same isolated gateway.
  const gateway = '/api/cli/analysis/v1/';
  const deletion = gateway + 'capabilities/track.program.delete/execute';
  await run(...del);
  assert.deepEqual(requests.filter(url => url.startsWith(gateway)), [deletion]);
  requests.length = 0;
  await run(...upload, '--replace');
  assert.deepEqual(requests.filter(url => url.startsWith(gateway)), [
    deletion, gateway + 'input-files', gateway + 'capabilities/track.program.excel_save/execute',
  ]);
});
