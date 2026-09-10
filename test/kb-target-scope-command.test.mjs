import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { add } from '../src/commands/te-kb/add.ts';
import { listSources } from '../src/commands/te-kb/list-sources.ts';
import { remove } from '../src/commands/te-kb/remove.ts';
import { rmSource } from '../src/commands/te-kb/rm-source.ts';
import { status } from '../src/commands/te-kb/status.ts';
import {
  getExternalKnowledgeBaseTargetScope,
} from '../src/commands/te-kb/target-scope.ts';
import { url } from '../src/commands/te-kb/url.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function context(values = {}) {
  return {
    str: (name) => values[name] ?? '',
    json: (name) => values[name],
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

describe('kb target scope command contract', () => {
  it('normalizes only personal and company without adding a default', () => {
    assert.equal(getExternalKnowledgeBaseTargetScope(context()), undefined);
    assert.equal(getExternalKnowledgeBaseTargetScope(context({ scope: ' personal ' })), 'personal');
    assert.equal(getExternalKnowledgeBaseTargetScope(context({ scope: 'company' })), 'company');
    assert.throws(
      () => getExternalKnowledgeBaseTargetScope(context({ scope: 'system' })),
      /Invalid --scope.*personal.*company/,
    );
  });

  it('adds scope to body, query, and upload preview only when explicitly requested', () => {
    const scoped = context({
      name: 'Engineering Handbook',
      scope: 'company',
      id: 'source-1',
      url: 'https://example.com/docs',
      files: ['./guide.md'],
    });
    assert.deepEqual(status.dryRun(scoped).body, {
      name: 'Engineering Handbook',
      scope: 'company',
    });
    assert.deepEqual(remove.dryRun(scoped).body, {
      name: 'Engineering Handbook',
      scope: 'company',
    });
    assert.deepEqual(rmSource.dryRun(scoped).body, {
      name: 'Engineering Handbook',
      scope: 'company',
      id: 'source-1',
    });
    assert.deepEqual(url.dryRun(scoped).body, {
      name: 'Engineering Handbook',
      scope: 'company',
      url: 'https://example.com/docs',
    });
    assert.deepEqual(add.dryRun(scoped).body, {
      name: 'Engineering Handbook',
      scope: 'company',
      files: [{ value: './guide.md', type: 'path' }],
      contentType: 'multipart/form-data',
    });
    assert.equal(
      new URL(listSources.dryRun(scoped).url).searchParams.get('scope'),
      'company',
    );

    const unscoped = context({
      name: 'Engineering Handbook',
      id: 'source-1',
      url: 'https://example.com/docs',
      files: ['./guide.md'],
    });
    for (const command of [status, remove, rmSource, url, add]) {
      assert.equal(Object.hasOwn(command.dryRun(unscoped).body, 'scope'), false);
    }
    assert.equal(new URL(listSources.dryRun(unscoped).url).searchParams.has('scope'), false);
  });

  it('puts an explicit scope in the actual multipart upload', async () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-scope-upload-'));
    const sourcePath = path.join(temporaryRoot, 'guide.md');
    writeFileSync(sourcePath, '# guide');
    let received;
    const server = http.createServer((request, response) => {
      const chunks = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        received = {
          headers: request.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        };
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ results: [] }));
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
      JSON.stringify({ url: host, token: 'cli-kb-scope-upload-test' }),
    );

    try {
      const result = await runCli(
        [
          '--host',
          host,
          'kb',
          '+add',
          '--name',
          'Engineering Handbook',
          '--scope',
          'company',
          '--files',
          JSON.stringify([sourcePath]),
        ],
        {
          HOME: path.join(temporaryRoot, 'home'),
          SANDBOX_RUNTIME_ROOT: runtimeRoot,
        },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(received.headers['content-type'], /^multipart\/form-data; boundary=/);
      assert.match(received.body, /name="scope"\r\n\r\ncompany/);
      assert.match(received.body, /name="name"\r\n\r\nEngineering Handbook/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
