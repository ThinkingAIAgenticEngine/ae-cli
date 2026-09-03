import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { listSources } from '../src/commands/te-kb/list-sources.ts';
import { rmSource } from '../src/commands/te-kb/rm-source.ts';
import { parseKbResponse } from '../src/core/mcp-access.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function context(values = {}) {
  return {
    str: (name) => values[name] ?? '',
    host: () => 'https://ta.example/',
  };
}

function captureError(callback) {
  let captured;
  try {
    callback();
  } catch (error) {
    captured = error;
  }
  assert.ok(captured, 'expected callback to throw');
  return captured;
}

function runCli(args, env, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args],
      {
        cwd: ROOT,
        env: { ...process.env, ...env },
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
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
    child.on('close', (status) => resolve({ status, stdout, stderr }));
    if (input !== undefined) child.stdin.end(input);
  });
}

test('kb +list-sources exposes a bounded read-only contract', () => {
  assert.equal(listSources.risk, 'read');
  assert.deepEqual(listSources.flags, [
    {
      name: 'name',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200,
      desc: 'Knowledge base name',
    },
  ]);
  assert.deepEqual(
    listSources.dryRun(context({ name: ' Engineering Handbook ' })),
    {
      method: 'GET',
      url: 'https://ta.example/agent/api/external/knowledge-bases/sources?name=Engineering+Handbook',
    },
  );
  assert.throws(
    () => listSources.validate(context({ name: '   ' })),
    /Invalid --name: must be non-empty/,
  );
  assert.throws(
    () => listSources.validate(context({ name: 'k'.repeat(201) })),
    /Must be at most 200 characters/,
  );
  assert.doesNotThrow(() =>
    listSources.validate(context({ name: ' k ' })),
  );
  assert.doesNotThrow(() =>
    listSources.validate(context({ name: ` ${'k'.repeat(200)} ` })),
  );
});

test('kb +list-sources rejects blank and oversized names locally without a request', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-list-sources-name-'));
  let requestCount = 0;
  const server = http.createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ items: [] }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;

  try {
    for (const name of ['   ', 'k'.repeat(201)]) {
      const result = await runCli(
        ['--host', host, 'kb', '+list-sources', '--name', name],
        { HOME: path.join(temporaryRoot, 'home') },
      );
      assert.equal(result.status, 1);
      const envelope = JSON.parse(result.stderr);
      assert.equal(envelope.error.type, 'validation');
    }
    assert.equal(requestCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +list-sources sends name as a GET query using only cli-token auth', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-list-sources-'));
  let received;
  const responseBody = {
    items: [
      {
        id: 'source-1',
        displayName: 'guide.md',
      },
    ],
  };
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      received = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(responseBody));
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
    JSON.stringify({ url: host, token: 'cli-kb-list-sources-test' }),
  );

  try {
    const result = await runCli(
      ['--host', host, 'kb', '+list-sources', '--name', 'Engineering Handbook'],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data, responseBody);
    assert.equal(received.method, 'GET');
    const requestUrl = new URL(received.url, host);
    assert.equal(
      requestUrl.pathname,
      '/agent/api/external/knowledge-bases/sources',
    );
    assert.equal(requestUrl.searchParams.get('name'), 'Engineering Handbook');
    assert.equal(received.headers['cli-token'], 'cli-kb-list-sources-test');
    assert.equal(received.headers.authorization, undefined);
    assert.equal(received.body, '');

    const help = await runCli(['kb', '+list-sources', '--help'], {
      HOME: path.join(temporaryRoot, 'home'),
      SANDBOX_RUNTIME_ROOT: runtimeRoot,
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /--name <value>/);
    assert.match(help.stdout, /Copy the stable\s+source\s+ID/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +list-sources retries one HTTP 401 and then succeeds', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-list-sources-401-'));
  let targetRequestCount = 0;
  const responseBody = { items: [{ id: 'source-after-retry' }] };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/agent/api/external/knowledge-bases/sources') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    targetRequestCount += 1;
    response.writeHead(targetRequestCount === 1 ? 401 : 200, {
      'content-type': 'application/json',
    });
    response.end(
      JSON.stringify(
        targetRequestCount === 1
          ? { error: 'Expired CLI token.' }
          : responseBody,
      ),
    );
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-list-sources-401-test' }),
  );

  try {
    const result = await runCli(
      ['--host', host, 'kb', '+list-sources', '--name', 'Engineering Handbook'],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data, responseBody);
    assert.equal(targetRequestCount, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +list-sources surfaces an empty HTTP 405 as a bounded API error', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-list-sources-405-'));
  const server = http.createServer((_request, response) => {
    response.writeHead(405);
    response.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-list-sources-405-test' }),
  );

  try {
    const result = await runCli(
      ['--host', host, 'kb', '+list-sources', '--name', 'Engineering Handbook'],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    const envelope = JSON.parse(result.stderr);
    assert.equal(envelope.ok, false);
    assert.equal(envelope.error.type, 'api');
    assert.match(
      envelope.error.message,
      /KB API HTTP error: 405(?: Method Not Allowed)? \(empty response body\)/,
    );
    assert.doesNotMatch(envelope.error.message, /Unexpected/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +list-sources does not add a capability-route hint to an ordinary HTTP 404', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-list-sources-404-'));
  const server = http.createServer((_request, response) => {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Knowledge base was not found.' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-list-sources-404-test' }),
  );

  try {
    const result = await runCli(
      ['--host', host, 'kb', '+list-sources', '--name', 'Missing Handbook'],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(result.stderr);
    assert.equal(envelope.error.type, 'api');
    assert.equal(envelope.error.message, 'Knowledge base was not found.');
    assert.equal(envelope.error.hint, undefined);
    assert.doesNotMatch(result.stderr, /capability route/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('parseKbResponse preserves JSON errors and classifies malformed HTTP bodies', () => {
  for (const testCase of [
    {
      body: {
        error: 'Source request was rejected.',
        code: 'SOURCE_REQUEST_REJECTED',
        hint: 'Check the source identifier and retry.',
      },
      expected: {
        message: 'Source request was rejected.',
        code: 'SOURCE_REQUEST_REJECTED',
        hint: 'Check the source identifier and retry.',
      },
    },
    {
      body: {
        error: {
          message: 'Source update is blocked.',
          code: 'SOURCE_UPDATE_BLOCKED',
          hint: 'Wait for the active compile to finish.',
        },
      },
      expected: {
        message: 'Source update is blocked.',
        code: 'SOURCE_UPDATE_BLOCKED',
        hint: 'Wait for the active compile to finish.',
      },
    },
    {
      body: {
        return_code: 42001,
        return_message: 'Legacy source request failed.',
        hint: 'Use a current source ID.',
      },
      expected: {
        message: 'Legacy source request failed.',
        code: '42001',
        hint: 'Use a current source ID.',
      },
    },
  ]) {
    const body = JSON.stringify(testCase.body);
    const error = captureError(() =>
      parseKbResponse(
        new Response(body, {
          status: 422,
          statusText: 'Unprocessable Entity',
        }),
        body,
      ),
    );
    assert.equal(error.message, testCase.expected.message);
    assert.equal(error.code, testCase.expected.code);
    assert.equal(error.hint, testCase.expected.hint);
    assert.equal(error.httpStatus, 422);
  }

  const emptyHttpError = captureError(() =>
    parseKbResponse(new Response(null, { status: 405 }), ''),
  );
  assert.match(
    emptyHttpError.message,
    /KB API HTTP error: 405(?: Method Not Allowed)? \(empty response body\)/,
  );
  assert.doesNotMatch(emptyHttpError.message, /Unexpected/);

  const htmlBody = `<html>${'sensitive upstream detail'.repeat(100)}</html>`;
  const nonJsonHttpError = captureError(() =>
    parseKbResponse(
      new Response(htmlBody, { status: 502, statusText: 'Bad Gateway' }),
      htmlBody,
    ),
  );
  assert.match(
    nonJsonHttpError.message,
    /KB API HTTP error: 502(?: Bad Gateway)? \(non-JSON response\)/,
  );
  assert.doesNotMatch(nonJsonHttpError.message, /<html>|sensitive upstream detail/);

  const emptySuccess = captureError(() =>
    parseKbResponse(new Response('', { status: 200, statusText: 'OK' }), ''),
  );
  assert.match(
    emptySuccess.message,
    /KB API protocol error: HTTP 200(?: OK)? \(empty response body\)/,
  );

  const invalidSuccessBody = '<html>not JSON</html>';
  const invalidSuccess = captureError(() =>
    parseKbResponse(
      new Response(invalidSuccessBody, { status: 200, statusText: 'OK' }),
      invalidSuccessBody,
    ),
  );
  assert.match(
    invalidSuccess.message,
    /KB API protocol error: HTTP 200(?: OK)? \(non-JSON response\)/,
  );
  assert.doesNotMatch(invalidSuccess.message, /<html>|not JSON/);
});

test('kb +rm-source uses one stable selector with ID priority and display-name compatibility', () => {
  assert.equal(rmSource.risk, 'high-risk-write');

  const idFlag = rmSource.flags.find((flag) => flag.name === 'id');
  assert.ok(idFlag);
  assert.equal(idFlag.type, 'string');
  assert.notEqual(idFlag.required, true);
  assert.notEqual(idFlag.variadic, true);

  const displayNameFlag = rmSource.flags.find(
    (flag) => flag.name === 'display-name',
  );
  assert.ok(displayNameFlag);
  assert.equal(displayNameFlag.type, 'string');
  assert.notEqual(displayNameFlag.required, true);

  assert.deepEqual(
    rmSource.dryRun(
      context({ name: 'Engineering Handbook', id: 'source-id-1' }),
    ).body,
    { name: 'Engineering Handbook', id: 'source-id-1' },
  );
  assert.deepEqual(
    rmSource.dryRun(
      context({
        name: 'Engineering Handbook',
        'display-name': 'legacy-guide.md',
      }),
    ).body,
    { name: 'Engineering Handbook', displayName: 'legacy-guide.md' },
  );
  assert.deepEqual(
    rmSource.dryRun(
      context({
        name: 'Engineering Handbook',
        id: 'source-id-1',
        'display-name': 'ignored-legacy-guide.md',
      }),
    ).body,
    { name: 'Engineering Handbook', id: 'source-id-1' },
  );
  assert.throws(
    () => rmSource.validate?.(context({ name: 'Engineering Handbook' })),
    /--id.*--display-name|--display-name.*--id/,
  );
});

test('kb +rm-source retries one HTTP 401 and preserves each selector body', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-rm-source-401-'));
  const targetRequests = [];
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/agent/api/external/knowledge-bases/sources') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      targetRequests.push({
        method: request.method,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      });
      const isRetry = targetRequests.length % 2 === 0;
      response.writeHead(isRetry ? 200 : 401, {
        'content-type': 'application/json',
      });
      response.end(
        JSON.stringify(isRetry ? { deleted: true } : { error: 'Expired CLI token.' }),
      );
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
    JSON.stringify({ url: host, token: 'cli-kb-rm-source-401-test' }),
  );
  const commandCases = [
    {
      selectorArgs: ['--id', 'source-id-1'],
      expectedBody: { name: 'Engineering Handbook', id: 'source-id-1' },
    },
    {
      selectorArgs: ['--display-name', 'legacy-guide.md'],
      expectedBody: {
        name: 'Engineering Handbook',
        displayName: 'legacy-guide.md',
      },
    },
    {
      selectorArgs: [
        '--id',
        'source-id-priority',
        '--display-name',
        'ignored-legacy-guide.md',
      ],
      expectedBody: {
        name: 'Engineering Handbook',
        id: 'source-id-priority',
      },
    },
  ];

  try {
    for (const commandCase of commandCases) {
      const result = await runCli(
        [
          '--yes',
          '--host',
          host,
          'kb',
          '+rm-source',
          '--name',
          'Engineering Handbook',
          ...commandCase.selectorArgs,
        ],
        {
          HOME: path.join(temporaryRoot, 'home'),
          SANDBOX_RUNTIME_ROOT: runtimeRoot,
        },
      );
      assert.equal(result.status, 0, result.stderr);
    }

    assert.equal(targetRequests.length, commandCases.length * 2);
    for (const [index, commandCase] of commandCases.entries()) {
      const attempts = targetRequests.slice(index * 2, index * 2 + 2);
      assert.deepEqual(attempts, [
        { method: 'DELETE', body: commandCase.expectedBody },
        { method: 'DELETE', body: commandCase.expectedBody },
      ]);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb source list and delete do not retry HTTP 403', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-sources-403-'));
  let targetRequestCount = 0;
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/agent/api/external/knowledge-bases/sources') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    targetRequestCount += 1;
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        error: 'Source access denied.',
        code: 'KB_SOURCE_FORBIDDEN',
        hint: 'Ask a knowledge base owner for source access.',
      }),
    );
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-sources-403-test' }),
  );
  const env = {
    HOME: path.join(temporaryRoot, 'home'),
    SANDBOX_RUNTIME_ROOT: runtimeRoot,
  };

  try {
    const listResult = await runCli(
      ['--host', host, 'kb', '+list-sources', '--name', 'Engineering Handbook'],
      env,
    );
    assert.equal(listResult.status, 1);
    assert.deepEqual(JSON.parse(listResult.stderr).error, {
      type: 'permission',
      code: 'KB_SOURCE_FORBIDDEN',
      message: 'Source access denied.',
      hint: 'Ask a knowledge base owner for source access.',
    });
    assert.equal(targetRequestCount, 1);

    const deleteResult = await runCli(
      [
        '--yes',
        '--host',
        host,
        'kb',
        '+rm-source',
        '--name',
        'Engineering Handbook',
        '--id',
        'source-id-1',
      ],
      env,
    );
    assert.equal(deleteResult.status, 1);
    assert.deepEqual(JSON.parse(deleteResult.stderr).error, {
      type: 'permission',
      code: 'KB_SOURCE_FORBIDDEN',
      message: 'Source access denied.',
      hint: 'Ask a knowledge base owner for source access.',
    });
    assert.equal(targetRequestCount, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +rm-source cancellation without --yes sends no DELETE request', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-rm-source-confirm-'));
  let targetRequestCount = 0;
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/agent/api/external/knowledge-bases/sources') {
      targetRequestCount += 1;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found.' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;
  const runtimeRoot = path.join(temporaryRoot, 'runtime');
  mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-kb-rm-source-confirm-test' }),
  );

  try {
    const result = await runCli(
      [
        '--host',
        host,
        'kb',
        '+rm-source',
        '--name',
        'Engineering Handbook',
        '--id',
        'source-id-1',
      ],
      {
        HOME: path.join(temporaryRoot, 'home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
      },
      'n\n',
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /high-risk-write operation/);
    assert.match(result.stderr, /Aborted\./);
    assert.equal(targetRequestCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +rm-source rejects a missing selector locally without sending a request', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-rm-source-validation-'));
  let requestCount = 0;
  const server = http.createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;

  try {
    const result = await runCli(
      [
        '--yes',
        '--host',
        host,
        'kb',
        '+rm-source',
        '--name',
        'Engineering Handbook',
      ],
      { HOME: path.join(temporaryRoot, 'home') },
    );

    assert.equal(result.status, 1);
    const envelope = JSON.parse(result.stderr);
    assert.equal(envelope.error.type, 'validation');
    assert.match(
      envelope.error.message,
      /--id.*--display-name|--display-name.*--id/,
    );
    assert.equal(requestCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('kb +rm-source dry-run and help expose one non-batch source ID without sending a request', async () => {
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-kb-rm-source-dry-run-'));
  let requestCount = 0;
  const server = http.createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const host = `http://127.0.0.1:${address.port}`;

  try {
    const dryRun = await runCli(
      [
        '--dry-run',
        '--host',
        host,
        'kb',
        '+rm-source',
        '--name',
        'Engineering Handbook',
        '--id',
        'source-id-1',
      ],
      { HOME: path.join(temporaryRoot, 'home') },
    );
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.deepEqual(JSON.parse(dryRun.stdout).data.body, {
      name: 'Engineering Handbook',
      id: 'source-id-1',
    });
    assert.equal(requestCount, 0);

    const help = await runCli(['kb', '+rm-source', '--help'], {
      HOME: path.join(temporaryRoot, 'home'),
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /--id <value>/);
    assert.match(help.stdout, /--display-name <value>/);
    assert.doesNotMatch(help.stdout, /--ids\b|--id <value\.\.\.>/);
    assert.equal(requestCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
