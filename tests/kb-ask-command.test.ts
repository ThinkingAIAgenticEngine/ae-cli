import assert from 'node:assert/strict';
import { PermissionError } from '../src/core/errors.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import { ask } from '../src/commands/te-kb/ask.ts';
import { askStatus } from '../src/commands/te-kb/ask-status.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { runCommand } from '../src/framework/runner.ts';
import {
  ASK_API_PATH,
  isTransientAskPollError,
  pollUntilSettled,
  transformCompletedResponse,
  type AskExecutionResponse,
} from '../src/commands/te-kb/ask-shared.ts';

const HOST = 'https://example.com';

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str(name) {
      const value = values[name];
      return typeof value === 'string' ? value : '';
    },
    num(name) {
      const value = values[name];
      return typeof value === 'number' ? value : 0;
    },
    optionalNum(name) {
      const value = values[name];
      return typeof value === 'number' ? value : undefined;
    },
    bool(name) {
      return values[name] === true;
    },
    json(name) {
      return values[name];
    },
    api: async () => {
      throw new Error('not used');
    },
    querySql: async () => {
      throw new Error('not used');
    },
    queryReportData: async () => {
      throw new Error('not used');
    },
    token: async () => '',
    host: () => HOST,
    mcpUrl: () => undefined,
    service: () => 'kb',
    out: async () => undefined,
  };
}

const QUESTION = 'How is the sandbox configured?';
const SOURCES = [{ scope: 'company', name: 'engineering-handbook' }];
const COMPLETED = {
  executionId: 'exec-1',
  status: 'completed',
  elapsedMs: 48000,
  answer: 'Use the sandbox wiki.',
  sources: [{ scope: 'company', name: 'engineering-handbook', path: 'wiki/sandbox.md' }],
  modelId: 'claude-sonnet-4-6',
  toolCallCount: 3,
  maxTurns: 50,
  modelUsage: {
    'claude-sonnet-4-6': { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
} as AskExecutionResponse;

// --- dry-run contracts: submit / --no-wait / ask-status ---

const submitPreview = ask.dryRun!(
  ctx({
    question: QUESTION,
    sources: SOURCES,
    'model-id': 'claude-sonnet-4-6',
    'max-turns': 50,
    locale: 'zh',
  }),
);
assert.equal(submitPreview.method, 'POST');
assert.equal(submitPreview.url, `${HOST}${ASK_API_PATH}`);
assert.deepEqual(submitPreview.body, {
  question: QUESTION,
  sources: SOURCES,
  modelId: 'claude-sonnet-4-6',
  locale: 'zh',
});
assert.equal(ask.flags.some((flag) => flag.name === 'max-turns'), false);

const noWaitPreview = ask.dryRun!(ctx({ question: QUESTION, 'no-wait': true }));
assert.equal(noWaitPreview.method, 'POST');
assert.equal(noWaitPreview.url, `${HOST}${ASK_API_PATH}`);
assert.deepEqual(noWaitPreview.body, { question: QUESTION });

const statusPreview = askStatus.dryRun!(ctx({ 'execution-id': 'abc123-def456' }));
assert.equal(statusPreview.method, 'GET');
assert.equal(statusPreview.url, `${HOST}${ASK_API_PATH}?executionId=abc123-def456`);

const encodedPreview = askStatus.dryRun!(ctx({ 'execution-id': 'id with space' }));
assert.match(encodedPreview.url, /executionId=id%20with%20space/);

assert.doesNotThrow(() => ask.validate?.(ctx({ question: QUESTION, locale: 'zh' })));
assert.throws(() => ask.validate?.(ctx({ question: QUESTION, locale: 'xx' })), /Invalid --locale/);
assert.throws(
  () => ask.validate?.(ctx({ question: '', locale: '' })),
  /Invalid --question length/,
);
assert.throws(() => askStatus.validate?.(ctx({ 'execution-id': '   ' })), /Invalid --execution-id/);

// --- poll to completed: public +ask JSON, no status/elapsedMs leak ---

const calls: string[] = [];
const completed = await pollUntilSettled(
  async (executionId) => {
    calls.push(executionId);
    if (calls.length === 1) {
      return { executionId, status: 'running', elapsedMs: 100 };
    }
    return COMPLETED;
  },
  'exec-1',
  { intervalMs: 1, timeoutMs: 1000, sleep: async () => undefined },
);
assert.equal(calls.length, 2);
assert.equal(completed.status, 'completed');

const publicResult = transformCompletedResponse(completed);
assert.deepEqual(publicResult, {
  executionId: 'exec-1',
  answer: 'Use the sandbox wiki.',
  sources: [{ scope: 'company', name: 'engineering-handbook', path: 'wiki/sandbox.md' }],
  modelId: 'claude-sonnet-4-6',
  toolCallCount: 3,
  modelUsage: {
    'claude-sonnet-4-6': { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});
assert.equal('status' in publicResult, false);
assert.equal('elapsedMs' in publicResult, false);
assert.equal('error' in publicResult, false);
assert.equal('maxTurns' in publicResult, false);

const emptyModelId = transformCompletedResponse({
  ...COMPLETED,
  modelId: '',
});
assert.equal(emptyModelId.modelId, '');

// --- failed poll preserves the server code ---

const failed = await pollUntilSettled(
  async (executionId) => ({
    executionId,
    status: 'failed',
    error: { code: 'timeout', message: 'Ask timed out after 300 seconds' },
  }),
  'exec-fail',
  { intervalMs: 1, timeoutMs: 1000, sleep: async () => undefined },
);
assert.equal(failed.status, 'failed');
assert.deepEqual(failed.error, {
  code: 'timeout',
  message: 'Ask timed out after 300 seconds',
});

// --- transient vs fatal poll errors ---

assert.equal(isTransientAskPollError(new TypeError('fetch failed')), true);
assert.equal(isTransientAskPollError(new Error('socket hang up')), true);
assert.equal(isTransientAskPollError(new PermissionError('forbidden')), false);
assert.equal(isTransientAskPollError(new Error('KB MCP token auth failed: HTTP 401')), false);

let getCount = 0;
await assert.rejects(
  () =>
    pollUntilSettled(
      async () => {
        getCount += 1;
        throw new PermissionError('no access');
      },
      'exec-403',
      { intervalMs: 1, timeoutMs: 1000, sleep: async () => undefined },
    ),
  /no access/,
);
assert.equal(getCount, 1);

let transientTries = 0;
const recovered = await pollUntilSettled(
  async (executionId) => {
    transientTries += 1;
    if (transientTries < 3) throw new TypeError('fetch failed');
    return { executionId, status: 'completed', answer: 'ok', sources: [] };
  },
  'exec-net',
  { intervalMs: 1, timeoutMs: 1000, maxTransientFailures: 3, sleep: async () => undefined },
);
assert.equal(transientTries, 3);
assert.equal(recovered.status, 'completed');

// --- framework envelopes: +ask failure / +ask-status success ---

const originalFetch = globalThis.fetch;
const originalExit = process.exit;
const originalStderrWrite = process.stderr.write;
const originalStdoutWrite = process.stdout.write;
const globalOptions = { format: 'json', validate: false, dryRun: false, yes: false } as const;
setCliTokenManual('cli-test-token', HOST);
try {
  let requestCount = 0;
  globalThis.fetch = (async () => {
    requestCount += 1;
    const data = requestCount === 1
      ? { executionId: 'exec-api-fail', status: 'running' }
      : {
          executionId: 'exec-api-fail',
          status: 'failed',
          error: { code: 'retrieval_error', message: 'Knowledge base retrieval failed' },
        };
    return new Response(JSON.stringify(data), {
      status: requestCount === 1 ? 202 : 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  let stderr = '';
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  process.exit = ((code?: number) => {
    throw new Error(`exit:${code}`);
  }) as typeof process.exit;

  await assert.rejects(
    () => runCommand(ask, { question: QUESTION }, globalOptions),
    /exit:1/,
  );
  const failureEnvelope = JSON.parse(stderr);
  assert.deepEqual(failureEnvelope.error, {
    type: 'api',
    message: 'Knowledge base retrieval failed (executionId: exec-api-fail)',
    code: 'retrieval_error',
  });
  assert.equal(failureEnvelope.error.category, undefined);
  assert.equal(failureEnvelope.error.retryable, undefined);

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        executionId: 'exec-status-fail',
        status: 'failed',
        error: { code: 'process_restart', message: 'Execution interrupted by restart' },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  let stdout = '';
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  await runCommand(askStatus, { executionId: 'exec-status-fail' }, globalOptions);
  assert.equal(JSON.parse(stdout).data.error.code, 'process_restart');
} finally {
  clearCliToken(HOST);
  globalThis.fetch = originalFetch;
  process.exit = originalExit;
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
}

process.stdout.write('kb ask command contract tests passed\n');

// Explicit contexts: submission carries selection, polling retains identity without its Header.
const candidateViews = [{
  resourceKey: 'kb:kb1', viewKind: 'candidate', consistency: 'candidate_pinned',
  candidateId: 'candidate1', baseVersion: 'v1', readIdentity: 'candidate-hash',
  versionId: null, versionNumber: null,
}];
assert.equal(ask.flags.some(flag => flag.name === 'read-context'), true);
const explicitPreview = ask.dryRun!(ctx({ question: QUESTION, 'read-context': 'kb_candidate_parent' }));
assert.deepEqual(explicitPreview.headers, { 'X-KB-Read-Context': 'kb_candidate_parent' });
setCliTokenManual('cli-test-token', HOST);
try {
  const calls: Array<{ method?: string; header: string | null }> = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    if (!String(_url).includes(ASK_API_PATH)) return new Response('{}', { status: 200 });
    calls.push({ method: init?.method, header: new Headers(init?.headers).get('X-KB-Read-Context') });
    return new Response(JSON.stringify(calls.length === 1
      ? { executionId: 'explicit', status: 'running', readViews: candidateViews }
      : { ...COMPLETED, executionId: 'explicit', readViews: candidateViews }), { status: calls.length === 1 ? 202 : 200 });
  }) as typeof fetch;
  const result = await ask.execute(ctx({ question: QUESTION, 'read-context': 'kb_candidate_parent' }));
  assert.deepEqual(JSON.parse(JSON.stringify(result.readViews)), candidateViews);
  assert.deepEqual(calls, [{ method: 'POST', header: 'kb_candidate_parent' }, { method: 'GET', header: null }]);

  globalThis.fetch = (async () => new Response(JSON.stringify({ executionId: 'old', status: 'running' }), { status: 202 })) as typeof fetch;
  await assert.rejects(() => ask.execute(ctx({ question: QUESTION, 'read-context': 'kb_candidate_parent', 'no-wait': true })), /readViews/);

  let count = 0;
  globalThis.fetch = (async (url: unknown) => {
    if (!String(url).includes(ASK_API_PATH)) return new Response('{}', { status: 200 });
    count++;
    return new Response(JSON.stringify(count === 1
      ? { executionId: 'changed', status: 'running', readViews: candidateViews }
      : { ...COMPLETED, readViews: [{ ...candidateViews[0], readIdentity: 'wrong' }] }), { status: 200 });
  }) as typeof fetch;
  await assert.rejects(() => ask.execute(ctx({ question: QUESTION, 'read-context': 'kb_candidate_parent' })), (error: any) => error.code === 'KB_READ_CONTEXT_MISMATCH');
  assert.equal(count, 2);
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(HOST);
}
process.stdout.write('explicit Ask context contracts passed\n');


// The inherited execution environment must not disable ordinary formal Ask with normal auth.
const oldRequired = process.env.AE_KB_READ_CONTEXT_REQUIRED;
const oldFile = process.env.AE_KB_READ_CONTEXT_FILE;
setCliTokenManual('cli-test-token', HOST);
try {
  process.env.AE_KB_READ_CONTEXT_REQUIRED = '1';
  process.env.AE_KB_READ_CONTEXT_FILE = '/missing-parent-file';
  globalThis.fetch = (async () => new Response(JSON.stringify({ executionId: 'ordinary', status: 'running' }), { status: 202 })) as typeof fetch;
  const response = await ask.execute(ctx({ question: QUESTION, 'no-wait': true }));
  assert.equal(response.executionId, 'ordinary');
} finally {
  if (oldRequired === undefined) delete process.env.AE_KB_READ_CONTEXT_REQUIRED;
  else process.env.AE_KB_READ_CONTEXT_REQUIRED = oldRequired;
  if (oldFile === undefined) delete process.env.AE_KB_READ_CONTEXT_FILE;
  else process.env.AE_KB_READ_CONTEXT_FILE = oldFile;
  globalThis.fetch = originalFetch;
  clearCliToken(HOST);
}

// Framework output must preserve the protocol mismatch code.
setCliTokenManual('cli-test-token', HOST);
try {
  let responseCount = 0;
  let errorOutput = '';
  globalThis.fetch = (async (url: unknown) => {
    if (!String(url).includes(ASK_API_PATH)) return new Response('{}', { status: 200 });
    responseCount++;
    return new Response(JSON.stringify(responseCount === 1
      ? { executionId: 'mismatch-envelope', status: 'running', readViews: candidateViews }
      : { ...COMPLETED, readViews: [{ ...candidateViews[0], readIdentity: 'changed' }] }), { status: 200 });
  }) as typeof fetch;
  process.stderr.write = ((chunk: string | Uint8Array) => { errorOutput += String(chunk); return true; }) as typeof process.stderr.write;
  process.exit = ((code?: number) => { throw new Error(`exit:${code}`); }) as typeof process.exit;
  await assert.rejects(() => runCommand(ask, { question: QUESTION, readContext: 'kb_candidate_parent' }, globalOptions), /exit:1/);
  assert.equal(JSON.parse(errorOutput).error.code, 'KB_READ_CONTEXT_MISMATCH');
} finally {
  globalThis.fetch = originalFetch;
  process.stderr.write = originalStderrWrite;
  process.exit = originalExit;
  clearCliToken(HOST);
}

setCliTokenManual('cli-test-token', HOST);
try {
  globalThis.fetch = (async (url: unknown) => String(url).includes(ASK_API_PATH)
    ? new Response(JSON.stringify({ error: 'Forbidden candidate', code: 'KB_READ_CONTEXT_FORBIDDEN' }), { status: 403 })
    : new Response('{}', { status: 200 })) as typeof fetch;
  await assert.rejects(() => ask.execute(ctx({ question: QUESTION, 'read-context': 'kb_candidate_parent', 'no-wait': true })),
    (error: any) => error.code === 'KB_READ_CONTEXT_FORBIDDEN');
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(HOST);
}
