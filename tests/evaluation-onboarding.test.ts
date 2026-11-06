import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvalApiError, evalDownloadFile, evalRequest } from '../src/core/eval-client.ts';
import { requestSandboxEvaluationSession } from '../src/core/eval-session.ts';
import { runCommand } from '../src/framework/runner.ts';
import { listDatasets } from '../src/commands/evaluation/list-datasets.ts';
import { createDataset } from '../src/commands/evaluation/create-dataset.ts';
import { downloadFile } from '../src/commands/evaluation/download-file.ts';
import { logger } from '../src/core/logger.ts';

const host = 'https://ae.example.com';
const html = '<!doctype html><html><body>Gateway page</body></html>';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const htmlResponse = (status = 200) => new Response(html, {
  status, headers: { 'Content-Type': 'text/html; charset=utf-8' },
});
const request = (response: () => Response) => evalRequest({
  baseUrl: host, method: 'GET', path: '/agenteval/api/v1/datasets',
  headers: { Authorization: 'Bearer synthetic-session' }, fetchImpl: async () => response(),
});

test('route failures provide actionable guidance without replacing existing error codes', async () => {
  for (const [response, code] of [
    [() => jsonResponse({ message: 'Not Found' }, 404), 'EVAL_API_HTTP_404'],
    [() => htmlResponse(), 'EVAL_API_INVALID_RESPONSE'],
    [() => htmlResponse(404), 'EVAL_API_INVALID_RESPONSE'],
  ] as const) {
    await assert.rejects(request(response), (error: unknown) => {
      assert.ok(error instanceof EvalApiError);
      assert.equal(error.code, code);
      assert.equal(error.onboarding?.status, 'module_not_detected');
      assert.equal(error.onboarding.host, host);
      assert.equal(error.onboarding.highlights.length, 3);
      assert.match(error.onboarding.next_steps.join(' '), /ThinkingData/);
      assert.match(error.onboarding.agent_instruction, /Stop evaluation commands/);
      assert.match(error.onboarding.agent_instruction, /save generated CSV\/JSON/);
      return true;
    });
  }
});

test('all structured business 404s retain their original code, message, hint and details', async () => {
  for (const code of ['DATASET_NOT_FOUND', 'RUN_NOT_FOUND', 'EVAL_NOT_FOUND', 'ASSET_NOT_FOUND', 'NOT_FOUND', 'FUTURE_RESOURCE_MISSING']) {
    await assert.rejects(request(() => jsonResponse({ error: { code, message: 'Missing resource', details: 'Check the ID.' } }, 404)),
      (error: unknown) => {
        assert.ok(error instanceof EvalApiError);
        assert.equal(error.code, code);
        assert.equal(error.message, 'Missing resource');
        assert.equal(error.hint, 'Check the ID.');
        assert.equal(error.onboarding, undefined);
        return true;
      });
  }
});

test('403 guidance preserves permission codes and does not assert installation', async () => {
  for (const response of [
    () => jsonResponse({ error: { code: 'PROJECT_ACCESS_DENIED', message: 'No project permission' } }, 403),
    () => htmlResponse(403),
  ]) {
    await assert.rejects(request(response), (error: unknown) => {
      assert.ok(error instanceof EvalApiError);
      assert.equal(error.httpStatus, 403);
      assert.ok(['PROJECT_ACCESS_DENIED', 'EVAL_API_INVALID_RESPONSE'].includes(error.code));
      assert.equal(error.onboarding?.status, 'access_not_granted');
      assert.match(error.onboarding.next_steps.join(' '), /does not establish cluster-wide installation/);
      assert.match(error.onboarding.next_steps.join(' '), /READER \/ EDITOR \/ ADMIN/);
      return true;
    });
  }
});

test('outages and malformed responses never claim a missing installation', async () => {
  for (const status of [500, 501, 502, 503, 504]) {
    for (const response of [() => htmlResponse(status), () => jsonResponse({ message: 'Unavailable' }, status)]) {
      await assert.rejects(request(response), (error: unknown) => {
        assert.ok(error instanceof EvalApiError);
        assert.equal(error.onboarding?.status, 'availability_unknown');
        return true;
      });
    }
  }
  await assert.rejects(request(() => new Response('broken JSON', { status: 200 })),
    (error: any) => error.code === 'EVAL_API_INVALID_RESPONSE' && error.onboarding.status === 'availability_unknown');
  assert.deepEqual(await request(() => jsonResponse({ items: [] })), { items: [] });
});

test('sandbox route failures do not establish evaluation installation; secrets remain redacted', async () => {
  const secret = 'synthetic-cli-token';
  for (const status of [200, 404, 502, 503]) {
    await assert.rejects(requestSandboxEvaluationSession(host, secret, undefined, async () => htmlResponse(status)),
      (error: any) => error.code === 'EVAL_SANDBOX_SESSION_FAILED' && error.onboarding?.status === 'availability_unknown');
  }
  await assert.rejects(requestSandboxEvaluationSession(host, secret, undefined, async () => jsonResponse({
    error: `Denied ${secret}`, session_token: 'synthetic-returned-session',
  }, 403)), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'EVAL_SANDBOX_SESSION_FAILED');
    assert.equal(error.onboarding?.status, 'access_not_granted');
    assert.ok(!JSON.stringify(error).includes(secret));
    assert.ok(!error.message.includes(secret));
    return true;
  });
});

test('a lost write response remains unconfirmed and can be reconciled without another write', async () => {
  for (const failure of ['network', 'timeout', 'gateway'] as const) {
    let writes = 0;
    let reads = 0;
    let accepted: { id: string } | undefined;
    const fetchImpl: typeof fetch = async (_url, init) => {
      if (init?.method === 'POST') {
        writes++;
        accepted = { id: 'dataset-accepted' };
        if (failure === 'gateway') return jsonResponse({ message: 'Bad Gateway' }, 502);
        if (failure === 'timeout') {
          return new Promise((_resolve, reject) => {
            init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
          });
        }
        throw new TypeError('response lost after server acceptance');
      }
      reads++;
      return jsonResponse({ items: [accepted] });
    };
    await assert.rejects(evalRequest({
      baseUrl: host, method: 'POST', path: '/agenteval/api/v1/datasets',
      headers: { Authorization: 'Bearer synthetic-session' }, body: { name: 'Accepted dataset' },
      fetchImpl, timeoutMs: failure === 'timeout' ? 5 : 30_000,
    }), (error: unknown) => {
      assert.ok(error instanceof EvalApiError);
      assert.equal(error.code, failure === 'network' ? 'EVAL_API_NETWORK_ERROR'
        : failure === 'timeout' ? 'EVAL_API_TIMEOUT' : 'EVAL_API_HTTP_502');
      assert.equal(error.onboarding?.status, 'availability_unknown');
      assert.match(error.onboarding.agent_instruction, /result is unconfirmed/);
      assert.match(error.onboarding.agent_instruction, /server may already have accepted it/);
      assert.match(error.onboarding.agent_instruction, /Do not resubmit blindly/);
      assert.match(error.onboarding.agent_instruction, /authorized read-only status checks/);
      return true;
    });
    assert.equal(writes, 1);
    assert.equal(reads, 0, 'reconciliation must not happen automatically during a failure');
    const result = await evalRequest({ baseUrl: host, method: 'GET', path: '/agenteval/api/v1/datasets',
      headers: { Authorization: 'Bearer synthetic-session' }, fetchImpl });
    assert.deepEqual(result, { items: [{ id: 'dataset-accepted' }] });
    assert.equal(writes, 1, 'reconciliation must not repeat the write');
    assert.equal(reads, 1);
  }
});

test('a denied delete does not block an independent authorized dataset read', async () => {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    requests.push(init!.method!);
    return init?.method === 'DELETE'
      ? jsonResponse({ error: { code: 'FORBIDDEN', message: 'Admin role required' } }, 403)
      : jsonResponse({ items: [] });
  };
  await assert.rejects(evalRequest({ baseUrl: host, method: 'DELETE', path: '/agenteval/api/v1/datasets/dataset-1',
    headers: { Authorization: 'Bearer synthetic-session' }, fetchImpl }), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'FORBIDDEN');
    assert.equal(error.onboarding?.status, 'access_not_granted');
    assert.match(error.onboarding.agent_instruction, /Stop only the denied operation/);
    assert.match(error.onboarding.agent_instruction, /Independent authorized operations may continue/);
    assert.match(error.onboarding.agent_instruction, /Do not probe other commands to bypass the denial/);
    assert.match(error.onboarding.agent_instruction, /only when that access scope is confirmed/);
    return true;
  });
  assert.deepEqual(await evalRequest({ baseUrl: host, method: 'GET', path: '/agenteval/api/v1/datasets',
    headers: { Authorization: 'Bearer synthetic-session' }, fetchImpl }), { items: [] });
  assert.deepEqual(requests, ['DELETE', 'GET']);
});

test('malformed or incomplete sandbox responses include guidance while valid contracts remain intact', async () => {
  for (const response of [
    () => new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response(''),
    () => new Response(null, { status: 204 }),
    () => jsonResponse({}),
    () => jsonResponse({ session_token: '' }),
    () => jsonResponse({ session_token: 123 }),
    () => jsonResponse({ error: { code: 'NOT_FOUND', message: 'Route missing' } }, 404),
  ]) {
    let calls = 0;
    await assert.rejects(requestSandboxEvaluationSession(host, 'synthetic-cli-token', undefined, async () => {
      calls++;
      return response();
    }), (error: unknown) => {
      assert.ok(error instanceof EvalApiError);
      assert.equal(error.code, 'EVAL_SANDBOX_SESSION_FAILED');
      assert.equal(error.onboarding?.status, 'availability_unknown');
      assert.match(error.onboarding.agent_instruction, /Stop blind retries/);
      assert.ok(!JSON.stringify(error).includes('synthetic-cli-token'));
      return true;
    });
    assert.equal(calls, 1);
  }
  assert.equal(await requestSandboxEvaluationSession(host, 'synthetic-cli-token', undefined,
    async () => jsonResponse({ session_token: 'valid-session' })), 'valid-session');
  await assert.rejects(requestSandboxEvaluationSession(host, 'synthetic-cli-token', undefined,
    async () => jsonResponse({ error: 'Multiple projects' }, 400)), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'EVAL_SANDBOX_SESSION_FAILED');
    assert.equal(error.message, 'Multiple projects');
    assert.match(error.hint!, /AE_EVAL_TE_PROJECT_ID/);
    assert.equal(error.onboarding, undefined);
    return true;
  });
});

test('Skill guidance preserves write uncertainty and scopes permission failures', async () => {
  const skill = await readFile(new URL('../skills/ae-evaluation/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /write result is unconfirmed/);
  assert.match(skill, /Do not claim either success or failure and do not resubmit blindly/);
  assert.match(skill, /authorized read-only status checks/);
  assert.match(skill, /no reliable identifier or lookup exists, ask the administrator\/support to verify/);
  assert.match(skill, /stop only the denied operation/);
  assert.match(skill, /Independent authorized operations may continue/);
  assert.match(skill, /Stop a whole project or module only when that access scope is confirmed/);
  assert.doesNotMatch(skill, /upload did not complete/);
});

test('HTML fallback downloads fail and remove the incomplete output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'evaluation-onboarding-'));
  const output = join(directory, 'dataset.csv');
  try {
    for (const body of [html, '"private-download-string"', '246813579', '{"private":"download-object"}', 'null', '[]']) {
      await assert.rejects(evalDownloadFile({ baseUrl: host, method: 'GET', path: '/agenteval/api/v1/files/file-1/content',
        headers: {}, fetchImpl: async () => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) }, output),
      (error: unknown) => {
        assert.ok(error instanceof EvalApiError);
        assert.equal(error.code, 'EVAL_API_INVALID_RESPONSE');
        assert.equal(error.onboarding?.status, 'module_not_detected');
        assert.ok(!error.message.includes(body));
        return true;
      });
      await assert.rejects(stat(output), { code: 'ENOENT' });
    }
    // JSON attachments remain byte-for-byte downloads, without stripping quotes or whitespace.
    const body = '  "private-download-string"\n';
    const result = await evalDownloadFile({ baseUrl: host, method: 'GET', path: '/agenteval/api/v1/files/file-1/content',
      headers: {}, fetchImpl: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) }, output);
    assert.deepEqual(result, { path: output, byte_size: Buffer.byteLength(body) });
    assert.equal(await readFile(output, 'utf8'), body);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('HTML media type cannot be accepted as a JSON API response', async () => {
  for (const [status, onboarding] of [[200, 'module_not_detected'], [403, 'access_not_granted'], [502, 'availability_unknown']] as const) {
    await assert.rejects(request(() => new Response('{"items":[]}', {
      status, headers: { 'Content-Type': 'Text/HTML; charset=utf-8' },
    })), (error: unknown) => {
      assert.ok(error instanceof EvalApiError);
      assert.equal(error.code, 'EVAL_API_INVALID_RESPONSE');
      assert.equal(error.httpStatus, status);
      assert.equal(error.onboarding?.status, onboarding);
      return true;
    });
  }
});

test('external missing-token commands preserve the legacy error without network requests', async () => {
  const original = {
    fetch: globalThis.fetch, exit: process.exit, stdout: process.stdout.write, stderr: process.stderr.write,
    info: logger.info, error: logger.error,
    env: { ...process.env },
  };
  const options = { host, format: 'json' as const, dryRun: false, validate: false, yes: true };
  const exit = Symbol('exit');
  let stdout = '';
  let stderr = '';
  const logs: string[] = [];
  try {
    delete process.env.AE_EVAL_ACCESS_TOKEN;
    delete process.env.AE_EVAL_BASE_URL;
    delete process.env.SANDBOX_RUNTIME_ROOT;
    process.exit = (() => { throw exit; }) as typeof process.exit;
    // Preserve the Node test runner's binary reporting frames while capturing CLI text output.
    process.stdout.write = ((chunk: any, ...args: any[]) => {
      if (typeof chunk !== 'string') return Reflect.apply(original.stdout, process.stdout, [chunk, ...args]);
      stdout += chunk;
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: any, ...args: any[]) => {
      if (typeof chunk !== 'string') return Reflect.apply(original.stderr, process.stderr, [chunk, ...args]);
      stderr += chunk;
      return true;
    }) as typeof process.stderr.write;
    logger.info = (message) => { logs.push(message); };
    logger.error = (message) => { logs.push(message); };
    for (const token of [undefined, '', '   ']) {
      if (token === undefined) delete process.env.AE_EVAL_ACCESS_TOKEN;
      else process.env.AE_EVAL_ACCESS_TOKEN = token;
      for (const command of [listDatasets, createDataset, downloadFile]) {
        stdout = ''; stderr = '';
        let calls = 0;
        globalThis.fetch = async () => {
          calls++;
          throw new TypeError('connection refused');
        };
        await assert.rejects(runCommand(command, {
          name: 'Local dataset', id: 'file-1', output: '/unused-evaluation-output.csv',
        }, options), (error) => error === exit);
        assert.equal(calls, 0);
        assert.equal(stdout, '');
        const envelope = JSON.parse(stderr);
        assert.equal(envelope.ok, false);
        assert.equal(envelope.error.type, 'api');
        assert.equal(envelope.error.code, 'EVAL_ACCESS_TOKEN_MISSING');
        assert.equal(envelope.error.message, 'AE_EVAL_ACCESS_TOKEN is not set.');
        assert.equal(envelope.error.details.onboarding.status, 'token_missing');
        assert.match(envelope.error.details.onboarding.next_steps.join(' '), /No evaluation request was sent/);
      }
    }
    // Dry-run never probes; configured tokens retain the original single-request behavior.
    globalThis.fetch = async () => { assert.fail('dry-run must not access the network'); };
    stdout = ''; stderr = '';
    await runCommand(createDataset, { name: 'Local dataset' }, { ...options, dryRun: true });
    assert.equal(JSON.parse(stdout).data.method, 'POST');
    assert.equal(stderr, '');

    process.env.AE_EVAL_ACCESS_TOKEN = 'synthetic-session';
    stdout = ''; stderr = ''; logs.length = 0;
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), `${host}/agenteval/api/v1/datasets`);
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer synthetic-session');
      return jsonResponse({ error: { code: 'FORBIDDEN', message: 'synthetic-session',
        details: { private: 'upstream-private-marker', onboarding: { status: 'forged' } } } }, 403);
    };
    await assert.rejects(runCommand(listDatasets, {}, options), (error) => error === exit);
    assert.equal(calls, 1);
    const error = JSON.parse(stderr).error;
    assert.equal(error.code, 'FORBIDDEN');
    assert.equal(error.type, 'api');
    assert.equal(error.details.onboarding.status, 'access_not_granted');
    assert.ok(!stderr.includes('synthetic-session'));
    assert.ok(!stderr.includes('upstream-private-marker'));
    assert.ok(!logs.join('\n').includes('synthetic-session'));
    const directory = await mkdtemp(join(tmpdir(), 'evaluation-html-privacy-'));
    try {
      for (const body of ['"private-download-string"', '246813579', '{"private":"download-object"}']) {
        stdout = ''; stderr = ''; logs.length = 0;
        let requests = 0;
        globalThis.fetch = async () => {
          requests++;
          return new Response(body, { headers: { 'Content-Type': 'text/html' } });
        };
        const output = join(directory, 'result.csv');
        await assert.rejects(runCommand(downloadFile, { id: 'file-1', output }, options), (error) => error === exit);
        assert.equal(requests, 1);
        assert.equal(stdout, '');
        const error = JSON.parse(stderr).error;
        assert.equal(error.code, 'EVAL_API_INVALID_RESPONSE');
        assert.equal(error.details.onboarding.status, 'module_not_detected');
        for (const marker of ['private-download-string', '246813579', 'download-object', 'synthetic-session']) {
          assert.ok(!stderr.includes(marker), 'response data must not appear in the error envelope');
          assert.ok(!logs.join('\n').includes(marker), 'response data must not appear in logs');
        }
        await assert.rejects(stat(output), { code: 'ENOENT' });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  } finally {
    globalThis.fetch = original.fetch; process.exit = original.exit;
    process.stdout.write = original.stdout; process.stderr.write = original.stderr;
    logger.info = original.info; logger.error = original.error;
    for (const key of ['AE_EVAL_ACCESS_TOKEN', 'AE_EVAL_BASE_URL', 'SANDBOX_RUNTIME_ROOT']) {
      if (original.env[key] === undefined) delete process.env[key]; else process.env[key] = original.env[key];
    }
  }
});
