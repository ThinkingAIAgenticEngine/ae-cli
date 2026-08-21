import assert from 'node:assert/strict';
import { PermissionError } from '../src/core/errors.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import { ask } from '../src/commands/te-kb/ask.ts';
import { askStatus } from '../src/commands/te-kb/ask-status.ts';
import {
  ASK_API_PATH,
  buildFailedMessage,
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
const COMPLETED: AskExecutionResponse = {
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
};

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
  maxTurns: 50,
  locale: 'zh',
});

const noWaitPreview = ask.dryRun!(ctx({ question: QUESTION, 'no-wait': true }));
assert.equal(noWaitPreview.method, 'POST');
assert.equal(noWaitPreview.url, `${HOST}${ASK_API_PATH}`);
assert.deepEqual(noWaitPreview.body, { question: QUESTION });

const statusPreview = askStatus.dryRun!(ctx({ 'execution-id': 'abc123-def456' }));
assert.equal(statusPreview.method, 'GET');
assert.equal(statusPreview.url, `${HOST}${ASK_API_PATH}?executionId=abc123-def456`);

const encodedPreview = askStatus.dryRun!(ctx({ 'execution-id': 'id with space' }));
assert.match(encodedPreview.url, /executionId=id%20with%20space/);

assert.doesNotThrow(() => ask.validate?.(ctx({ question: QUESTION, locale: 'zh', 'max-turns': 10 })));
assert.throws(() => ask.validate?.(ctx({ question: QUESTION, locale: 'xx' })), /Invalid --locale/);
assert.throws(
  () => ask.validate?.(ctx({ question: '', locale: '', 'max-turns': 0 })),
  /Invalid --question length/,
);
assert.throws(() => askStatus.validate?.(ctx({ 'execution-id': '   ' })), /Invalid --execution-id/);

// --- poll to completed: isomorphic JSON, no status/elapsedMs leak ---

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

const isomorphic = transformCompletedResponse(completed);
assert.deepEqual(isomorphic, {
  executionId: 'exec-1',
  answer: 'Use the sandbox wiki.',
  sources: [{ scope: 'company', name: 'engineering-handbook', path: 'wiki/sandbox.md' }],
  modelId: 'claude-sonnet-4-6',
  toolCallCount: 3,
  maxTurns: 50,
  modelUsage: {
    'claude-sonnet-4-6': { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});
assert.equal('status' in isomorphic, false);
assert.equal('elapsedMs' in isomorphic, false);
assert.equal('error' in isomorphic, false);

const emptyModelId = transformCompletedResponse({
  ...COMPLETED,
  modelId: '',
});
assert.equal(emptyModelId.modelId, '');

// --- failed poll surfaces typed error prefix ---

const failed = await pollUntilSettled(
  async (executionId) => ({
    executionId,
    status: 'failed',
    error: { type: 'timeout', message: 'Ask timed out after 300 seconds' },
  }),
  'exec-fail',
  { intervalMs: 1, timeoutMs: 1000, sleep: async () => undefined },
);
assert.equal(failed.status, 'failed');
assert.equal(
  buildFailedMessage(failed),
  '[timeout] Ask timed out after 300 seconds (executionId: exec-fail)',
);
assert.match(buildFailedMessage({ executionId: 'x', status: 'failed' }), /^\[unknown\] /);

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

process.stdout.write('kb ask command contract tests passed\n');
