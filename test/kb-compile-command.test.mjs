import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/commands/te-kb/compile.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function context(values = {}) {
  return {
    str: (name) => values[name] ?? '',
    host: () => 'https://ta.example/',
  };
}

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args],
      {
        cwd: ROOT,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (statusCode) => resolve({ status: statusCode, stdout, stderr }));
  });
}

async function captureCompileRequest(commandArgs) {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-compile-'));
  let received;
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    if (requestUrl.pathname !== '/agent/api/external/knowledge-bases/compile') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      received = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      };
      response.writeHead(202, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'queued', runId: 'run-1' }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-compile-test' }),
  );

  try {
    const result = await runCli(
      ['--host', host, 'kb', '+compile', '--name', 'Engineering Handbook', ...commandArgs],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return received;
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

describe('kb +compile command', () => {
  it('forwards --model in dry-run and execute', async () => {
    assert.deepEqual(
      compile.dryRun(
        context({
          name: 'Engineering Handbook',
          mode: 'full',
          scope: 'company',
          model: 'model-record-id',
        }),
      ).body,
      {
        name: 'Engineering Handbook',
        mode: 'full',
        scope: 'company',
        model: 'model-record-id',
      },
    );

    const received = await captureCompileRequest([
      '--mode',
      'full',
      '--scope',
      'company',
      '--model',
      'model-record-id',
    ]);
    assert.equal(received.method, 'POST');
    assert.equal(received.url, '/agent/api/external/knowledge-bases/compile');
    assert.equal(received.headers['cli-token'], 'cli-kb-compile-test');
    assert.deepEqual(received.body, {
      name: 'Engineering Handbook',
      mode: 'full',
      scope: 'company',
      model: 'model-record-id',
    });
  });

  it('omits model when --model is absent', async () => {
    assert.deepEqual(compile.dryRun(context({ name: 'Engineering Handbook' })).body, {
      name: 'Engineering Handbook',
      mode: 'incremental',
    });

    const received = await captureCompileRequest([]);
    assert.deepEqual(received.body, {
      name: 'Engineering Handbook',
      mode: 'incremental',
    });
  });
});
