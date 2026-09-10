import assert from 'node:assert/strict';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { kbGrep } from '../src/commands/te-kb/kb-grep.ts';
import { kbRead } from '../src/commands/te-kb/kb-read.ts';
import { runCommand } from '../src/framework/runner.ts';
import type { Command, RuntimeContext } from '../src/framework/types.ts';

const HOST = 'https://example.com';
const SOURCE = { scope: 'company', name: 'engineering-handbook' };
const globalOptions = { format: 'json', validate: false, dryRun: false, yes: false } as const;

function flag(command: Command, name: string) {
  const result = command.flags.find((item) => item.name === name);
  assert.ok(result, `missing --${name}`);
  return result;
}

function dryRunContext(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => typeof values[name] === 'string' ? String(values[name]) : '',
    num: (name) => typeof values[name] === 'number' ? Number(values[name]) : 0,
    optionalNum: (name) => typeof values[name] === 'number' ? Number(values[name]) : undefined,
    bool: (name) => values[name] === true,
    json: (name) => values[name],
    list: () => [],
    api: async () => { throw new Error('not used'); },
    communityReport: async () => { throw new Error('not used'); },
    localDataUpload: async () => { throw new Error('not used'); },
    querySql: async () => { throw new Error('not used'); },
    queryReportData: async () => { throw new Error('not used'); },
    token: async () => '',
    host: () => HOST,
    mcpUrl: () => undefined,
    service: () => 'kb',
    out: async () => undefined,
  };
}

assert.deepEqual(
  { min: flag(kbGrep, 'top-k').min, max: flag(kbGrep, 'top-k').max },
  { min: 1, max: 50 },
);
assert.deepEqual(
  { min: flag(kbRead, 'limit').min, max: flag(kbRead, 'limit').max },
  { min: 1, max: 2000 },
);
assert.equal(flag(kbRead, 'offset').min, 1);
assert.match(flag(kbRead, 'limit').desc, /1-2000/);

assert.deepEqual(
  (await kbGrep.dryRun!(dryRunContext({
    query: 'sandbox',
    sources: [SOURCE],
    paths: ['wiki/sandbox.md'],
    'top-k': 50,
  }))).body,
  { query: 'sandbox', sources: [SOURCE], paths: ['wiki/sandbox.md'], topK: 50 },
);
assert.deepEqual(
  (await kbRead.dryRun!(dryRunContext({
    source: SOURCE,
    path: 'wiki/sandbox.md',
    offset: 1,
    limit: 2000,
  }))).body,
  { source: SOURCE, path: 'wiki/sandbox.md', offset: 1, limit: 2000 },
);
assert.deepEqual(
  (await kbGrep.dryRun!(dryRunContext({
    query: 'sandbox',
    sources: [SOURCE],
    paths: ['wiki/sandbox.md'],
  }))).body,
  { query: 'sandbox', sources: [SOURCE], paths: ['wiki/sandbox.md'] },
);
assert.deepEqual(
  (await kbRead.dryRun!(dryRunContext({ source: SOURCE, path: 'wiki/sandbox.md' }))).body,
  { source: SOURCE, path: 'wiki/sandbox.md' },
);

const originalFetch = globalThis.fetch;
const originalExit = process.exit;
const originalStderrWrite = process.stderr.write;
const originalStdoutWrite = process.stdout.write;

class ExitSignal extends Error {
  constructor(readonly code: number | undefined) {
    super(`exit:${code}`);
  }
}

let requestCount = 0;
let requestBodies: Record<string, unknown>[] = [];
let stderr = '';

async function expectLocalValidation(command: Command, options: Record<string, unknown>, message: RegExp) {
  requestCount = 0;
  stderr = '';
  await assert.rejects(() => runCommand(command, options, globalOptions), ExitSignal);
  assert.equal(requestCount, 0);
  assert.match(stderr, /"type": "validation"/);
  assert.match(stderr, message);
}

setCliTokenManual('cli-test-token', HOST);
try {
  globalThis.fetch = (async (_input, init) => {
    requestCount += 1;
    requestBodies.push(JSON.parse(String(init?.body ?? '{}')));
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  process.exit = ((code?: number) => { throw new ExitSignal(code); }) as typeof process.exit;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;

  requestBodies = [];
  await runCommand(kbGrep, {
    query: 'sandbox',
    sources: [SOURCE],
    paths: ['wiki/sandbox.md'],
    topK: 50,
  }, globalOptions);
  await runCommand(kbRead, {
    source: SOURCE,
    path: 'wiki/sandbox.md',
    offset: 1,
    limit: 2000,
  }, globalOptions);
  assert.deepEqual(requestBodies, [
    { query: 'sandbox', sources: [SOURCE], paths: ['wiki/sandbox.md'], topK: 50 },
    { source: SOURCE, path: 'wiki/sandbox.md', offset: 1, limit: 2000 },
  ]);

  const grepOptions = { query: 'sandbox', sources: [SOURCE], paths: ['wiki/sandbox.md'] };
  const readOptions = { source: SOURCE, path: 'wiki/sandbox.md' };
  await expectLocalValidation(kbGrep, { ...grepOptions, topK: 51 }, /integer between 1 and 50/);
  await expectLocalValidation(kbRead, { ...readOptions, limit: 2001 }, /integer from 1 to 2000/);
  await expectLocalValidation(kbRead, { ...readOptions, offset: 0 }, /--offset/);
  await expectLocalValidation(kbRead, { ...readOptions, offset: 1.5 }, /--offset.*integer/);
} finally {
  clearCliToken(HOST);
  globalThis.fetch = originalFetch;
  process.exit = originalExit;
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
}

process.stdout.write('kb retrieval numeric boundary command tests passed\n');
