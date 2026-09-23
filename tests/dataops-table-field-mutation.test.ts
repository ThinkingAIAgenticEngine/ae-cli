/**
 * DataOps single-field table mutation command contract tests.
 *
 * Run:
 *   npx tsx tests/dataops-table-field-mutation.test.ts
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import { addTableField } from '../src/commands/te-dataops/datatable/add-table-field.js';
import { modifyTableField } from '../src/commands/te-dataops/datatable/modify-table-field.js';
import { deleteTableField } from '../src/commands/te-dataops/datatable/delete-table-field.js';
import datatableCommands from '../src/commands/te-dataops/datatable/index.js';
import { callDataopsApi } from '../src/commands/te-dataops/shared.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { CliApiError, CliValidationError } from '../src/core/errors.js';
import { runCommand } from '../src/framework/runner.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  ok - ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stderr.write(`  FAIL - ${name}\n`);
    process.stderr.write(`        ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

function ctx(values: Record<string, unknown>, host = 'https://table-field.test'): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    list: () => [],
    api: async () => undefined,
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'dataops_datatable',
    out: async () => undefined,
  };
}

function response(data: unknown): Response {
  return new Response(JSON.stringify({ returnCode: 0, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

console.log('dataops table field mutation');

await test('registers the three singular commands with the frozen flags and risks', () => {
  assert.equal(datatableCommands.find((command) => command.command === '+add_table_field'), addTableField);
  assert.equal(datatableCommands.find((command) => command.command === '+modify_table_field'), modifyTableField);
  assert.equal(datatableCommands.find((command) => command.command === '+delete_table_field'), deleteTableField);

  assert.deepEqual(
    addTableField.flags.map(({ name, required }) => ({ name, required })),
    [
      { name: 'spaceCode', required: true },
      { name: 'tableName', required: true },
      { name: 'fieldName', required: true },
      { name: 'fieldType', required: true },
      { name: 'comment', required: false },
    ],
  );
  assert.deepEqual(
    modifyTableField.flags.map(({ name, required }) => ({ name, required })),
    [
      { name: 'spaceCode', required: true },
      { name: 'tableName', required: true },
      { name: 'fieldName', required: true },
      { name: 'fieldType', required: false },
      { name: 'comment', required: false },
      { name: 'clearComment', required: false },
    ],
  );
  assert.deepEqual(
    deleteTableField.flags.map(({ name, required }) => ({ name, required })),
    [
      { name: 'spaceCode', required: true },
      { name: 'tableName', required: true },
      { name: 'fieldName', required: true },
    ],
  );
  assert.equal(addTableField.risk, 'write');
  assert.equal(modifyTableField.risk, 'write');
  assert.equal(deleteTableField.risk, 'high-risk-write');
});

await test('modify requires one change and rejects conflicting comment flags', () => {
  assert.throws(
    () => modifyTableField.validate?.(ctx({})),
    (error: unknown) => error instanceof CliValidationError && error.code === 'MISSING_FIELD_CHANGE',
  );
  assert.throws(
    () => modifyTableField.validate?.(ctx({ comment: 'new', clearComment: true })),
    (error: unknown) => error instanceof CliValidationError && error.code === 'CONFLICTING_COMMENT_CHANGE',
  );
  assert.doesNotThrow(() => modifyTableField.validate?.(ctx({ fieldType: 'bigint', comment: 'new' })));
  assert.doesNotThrow(() => modifyTableField.validate?.(ctx({ clearComment: true })));
});

await test('dry-run calls the semantic preview endpoint instead of returning a local request plan', async () => {
  const host = 'https://table-field-preview.test';
  clearCliToken(host);
  setCliTokenManual('table-field-token', host);
  const previousFetch = globalThis.fetch;
  let requestUrl = '';
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = (async (url, init) => {
    requestUrl = String(url);
    requestBody = JSON.parse(String(init?.body));
    return response({
      status: 'SUCCESS',
      action: 'add_table_field',
      result: { success: true, preview: true, executable: true, wouldChange: true },
    });
  }) as typeof fetch;

  try {
    const result = await addTableField.dryRun?.(ctx({
      spaceCode: 'demo',
      tableName: 'orders',
      fieldName: 'amount',
      fieldType: 'bigint',
      comment: 'Order amount',
    }, host)) as any;
    assert.match(requestUrl, /\/api\/cli\/dataops\/v1\/gaia\/datatable\/table-fields\/add$/);
    assert.deepEqual(requestBody, {
      spaceCode: 'demo',
      tableName: 'orders',
      fieldName: 'amount',
      fieldType: 'bigint',
      comment: 'Order amount',
      preview: true,
    });
    assert.equal(result.result.preview, true);
    assert.equal(result.method, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});

await test('execute omits preview and clearComment is explicit', async () => {
  const host = 'https://table-field-execute.test';
  clearCliToken(host);
  setCliTokenManual('table-field-token', host);
  const previousFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = (async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return response({
      status: 'SUCCESS',
      action: 'modify_table_field',
      result: { success: true, outcome: 'CHANGED' },
    });
  }) as typeof fetch;

  try {
    await modifyTableField.execute(ctx({
      spaceCode: 'demo',
      tableName: 'orders',
      fieldName: 'amount',
      clearComment: true,
    }, host));
    assert.deepEqual(requestBody, {
      spaceCode: 'demo',
      tableName: 'orders',
      fieldName: 'amount',
      clearComment: true,
    });
    assert.ok(!('preview' in requestBody));
    assert.ok(!('entityId' in requestBody));
    assert.ok(!('expectedVersion' in requestBody));
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});

for (const outcome of ['FAILED', 'PARTIAL']) {
  await test(`${outcome} becomes a structured API error for a new command`, async () => {
    const host = `https://table-field-${outcome.toLowerCase()}.test`;
    clearCliToken(host);
    setCliTokenManual('table-field-token', host);
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => response({
      status: 'FAILED',
      action: 'modify_table_field',
      result: {
        success: false,
        outcome,
        errorType: outcome === 'PARTIAL' ? 'TYPE_CHANGE_FAILED' : 'FIELD_NOT_FOUND',
        message: outcome === 'PARTIAL' ? 'Type change failed after updating the comment.' : 'Field was not found.',
        hint: 'Read the current DEV table detail before retrying.',
        inputPath: 'fieldName',
        diff: outcome === 'PARTIAL' ? { before: { comment: 'old' }, after: { comment: 'new' } } : null,
      },
    })) as typeof fetch;

    try {
      await assert.rejects(
        () => modifyTableField.execute(ctx({
          spaceCode: 'demo',
          tableName: 'orders',
          fieldName: 'amount',
          fieldType: 'bigint',
        }, host)),
        (error: unknown) => {
          assert.ok(error instanceof CliApiError);
          assert.equal(error.code, outcome === 'PARTIAL' ? 'TYPE_CHANGE_FAILED' : 'FIELD_NOT_FOUND');
          assert.equal(error.hint, 'Read the current DEV table detail before retrying.');
          assert.equal(error.meta?.outcome, outcome);
          assert.equal(error.meta?.inputPath, 'fieldName');
          return true;
        },
      );
    } finally {
      globalThis.fetch = previousFetch;
      clearCliToken(host);
    }
  });
}

await test('the existing DataOps transport still returns an inner FAILED result', async () => {
  const host = 'https://table-field-legacy.test';
  clearCliToken(host);
  setCliTokenManual('table-field-token', host);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => response({
    status: 'FAILED',
    action: 'modify_table_field',
    result: { success: false, outcome: 'FAILED', errorType: 'FIELD_NOT_FOUND', message: 'Missing.' },
  })) as typeof fetch;

  try {
    const result = await callDataopsApi(ctx({}, host), 'datatable_modify_table_field', {
      spaceCode: 'demo',
      tableName: 'orders',
      fieldName: 'amount',
    }) as any;
    assert.equal(result.status, 'FAILED');
    assert.equal(result.result.errorType, 'FIELD_NOT_FOUND');
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});

await test('the runner renders field failures as an API envelope and exits non-zero', async () => {
  const command: Command = {
    service: 'dataops_datatable',
    command: '+test_field_failure',
    description: 'Test field failure',
    flags: [],
    risk: 'read',
    execute: async () => {
      throw new CliApiError('Field was not found.', {
        code: 'FIELD_NOT_FOUND',
        hint: 'Use add_table_field to create it.',
        meta: { outcome: 'FAILED' },
      });
    },
  };
  const originalExit = process.exit;
  const originalStderrWrite = process.stderr.write;
  let stderr = '';
  (process as any).exit = (code?: number) => {
    throw new Error(`process.exit:${code}`);
  };
  (process.stderr as any).write = (chunk: unknown) => {
    stderr += String(chunk);
    return true;
  };
  try {
    await assert.rejects(
      () => runCommand(command, {}, {
        host: 'https://table-field-runner.test',
        format: 'json',
        validate: false,
        dryRun: false,
        yes: false,
      }),
      /process\.exit:1/,
    );
    assert.match(stderr, /"ok": false/);
    assert.match(stderr, /"type": "api"/);
    assert.match(stderr, /"code": "FIELD_NOT_FOUND"/);
    assert.match(stderr, /"outcome": "FAILED"/);
  } finally {
    process.exit = originalExit;
    process.stderr.write = originalStderrWrite;
  }
});

await test('the DataOps skill documents the transitional single-field workflow', async () => {
  const reference = await readFile(
    new URL('../skills/ae-dataops/references/dataops-table.md', import.meta.url),
    'utf8',
  );
  for (const command of ['+add_table_field', '+modify_table_field', '+delete_table_field']) {
    assert.match(reference, new RegExp(command.replace('+', '\\+')));
  }
  assert.match(reference, /Transition status: transitional/);
  assert.match(reference, /semantic preview/i);
  assert.match(reference, /partition field/i);
  assert.match(reference, /DEV only/i);
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
