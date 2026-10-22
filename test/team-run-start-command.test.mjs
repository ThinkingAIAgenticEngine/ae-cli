import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('team +run-start preserves the save target in preview and HTTP requests', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-team-save-'));
  const requests = [];
  const server = http.createServer((request, response) => {
    if (request.url !== '/agent/api/external/team/teamrun/start') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end('{}');
      return;
    }
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      requests.push({ method: request.method, url: request.url, body });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: 'run-1', saveToKnowledgeBaseId: body.saveToKnowledgeBaseId ?? null }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtimeRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'team-save-test-token' }));

  const runCli = (args) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', '--host', host, 'team', '+run-start', '--team-id', 'team-1', '--input', 'Save this report', ...args], {
      cwd: ROOT,
      env: { ...process.env, HOME: path.join(temporaryRoot, 'home'), SANDBOX_RUNTIME_ROOT: runtimeRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });

  try {
    for (const target of ['personal-kb-id', 'company-kb-id', undefined]) {
      const flags = target ? ['--save-to-kb-id', target] : [];
      const expectedBody = { teamId: 'team-1', input: 'Save this report' };
      if (target) expectedBody.saveToKnowledgeBaseId = target;
      const preview = await runCli([...flags, '--dry-run']);
      assert.equal(preview.status, 0, preview.stderr);
      const previewData = JSON.parse(preview.stdout).data;
      assert.deepEqual(previewData.body, expectedBody);
      const before = requests.length;
      const result = await runCli(flags);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).data.saveToKnowledgeBaseId, target ?? null);
      assert.equal(requests.length, before + 1);
      assert.deepEqual(requests.at(-1), {
        method: 'POST',
        url: '/agent/api/external/team/teamrun/start',
        body: expectedBody,
      });
    }
    assert.equal(requests.length, 3, 'dry-run must not send requests');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
