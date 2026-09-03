/**
 * DataOps backfill job command contract tests.
 *
 * Run:
 *   npx tsx tests/dataops-backfill-contract.test.ts
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Command, DryRunResult, RuntimeContext } from '../src/framework/types.js';
import { createBackfillJob } from '../src/commands/te-dataops/operations/create-backfill-job.js';
import { deleteBackfillJob } from '../src/commands/te-dataops/operations/delete-backfill-job.js';
import { getBackfillJobDetail } from '../src/commands/te-dataops/operations/get-backfill-job-detail.js';
import { listBackfillFlows } from '../src/commands/te-dataops/operations/list-backfill-flows.js';
import { rerunBackfillJob } from '../src/commands/te-dataops/operations/rerun-backfill-job.js';
import { runBackfillJob } from '../src/commands/te-dataops/operations/run-backfill-job.js';
import { searchBackfillJobs } from '../src/commands/te-dataops/operations/search-backfill-jobs.js';
import { stopBackfillJob } from '../src/commands/te-dataops/operations/stop-backfill-job.js';
import { updateBackfillJob } from '../src/commands/te-dataops/operations/update-backfill-job.js';
import operationsCommands from '../src/commands/te-dataops/operations/index.js';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ok - ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stderr.write(`  FAIL - ${name}\n`);
    process.stderr.write(`        ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => {
      const value = values[name];
      if (value === undefined || value === null) return '';
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    },
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === ''
      ? undefined
      : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => {
      const value = values[name];
      if (value === undefined || value === null) return undefined;
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    list: (name) => Array.isArray(values[name]) ? values[name] as string[] : [],
    api: async () => undefined,
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => 'http://example.test',
    mcpUrl: () => undefined,
    service: () => 'dataops_operations',
    out: async () => undefined,
  };
}

async function dryRun(command: Command, values: Record<string, unknown>): Promise<DryRunResult> {
  const context = ctx(values);
  command.validate?.(context);
  const result = await command.dryRun?.(context);
  assert.ok(result, `${command.command} must implement dryRun`);
  return result;
}

function assertValidationError(command: Command, values: Record<string, unknown>, pattern: RegExp): void {
  assert.throws(() => command.validate?.(ctx(values)), pattern);
}

console.log('dataops backfill contract');

await test('backfill lifecycle commands include full draft update and deletion with the agreed risks', () => {
  const expected = new Map<string, [Command, Command['risk']]>([
    ['+list_backfill_flows', [listBackfillFlows, 'read']],
    ['+create_backfill_job', [createBackfillJob, 'write']],
    ['+run_backfill_job', [runBackfillJob, 'write']],
    ['+search_backfill_jobs', [searchBackfillJobs, 'read']],
    ['+get_backfill_job_detail', [getBackfillJobDetail, 'read']],
    ['+stop_backfill_job', [stopBackfillJob, 'high-risk-write']],
    ['+rerun_backfill_job', [rerunBackfillJob, 'write']],
    ['+update_backfill_job', [updateBackfillJob, 'write']],
    ['+delete_backfill_job', [deleteBackfillJob, 'high-risk-write']],
  ]);

  for (const [name, [command, risk]] of expected) {
    assert.equal(operationsCommands.find((candidate) => candidate.command === name), command, name);
    assert.equal(command.service, 'dataops_operations', name);
    assert.equal(command.risk, risk, name);
  }
});

await test('update submits the job ID and a complete draft configuration', async () => {
  const update = await dryRun(updateBackfillJob, {
    spaceCode: 'demo',
    jobId: 42,
    jobName: 'Updated backfill',
    flowCode: 1001,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
  });

  assert.equal(update.method, 'POST');
  assert.match(update.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/jobs\/update$/);
  assert.deepEqual(update.body, {
    spaceCode: 'demo',
    jobName: 'Updated backfill',
    flowCode: 1001,
    jobType: 'TASK_ALL',
    failureStrategy: 'END',
    parallel: true,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    step: 1,
    unit: 'DAY',
    reverse: false,
    jobId: 42,
  });

  assertValidationError(updateBackfillJob, {
    spaceCode: 'demo',
    jobId: 42,
    jobName: 'Updated backfill',
    flowCode: 1001,
  }, /both --startDate and --endDate/i);
  assertValidationError(updateBackfillJob, {
    spaceCode: 'demo',
    jobId: 42,
    jobName: 'Updated backfill',
    flowCode: 1001,
    startDate: '2026-08-03',
    endDate: '2026-08-01',
  }, /startDate must not be after/i);
  assertValidationError(updateBackfillJob, {
    spaceCode: 'demo',
    jobId: 0,
    jobName: 'Updated backfill',
    flowCode: 1001,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    completeDates: ['2026-08-01'],
  }, /jobId.*positive safe integer/i);
});

await test('delete submits only the scoped job identity', async () => {
  const deletion = await dryRun(deleteBackfillJob, { spaceCode: 'demo', jobId: 42 });
  assert.equal(deletion.method, 'POST');
  assert.match(deletion.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/jobs\/delete$/);
  assert.deepEqual(deletion.body, { spaceCode: 'demo', jobId: 42 });
});

await test('dry-run maps all commands to the external DataOps gateway contract', async () => {
  const list = await dryRun(listBackfillFlows, { spaceCode: 'demo' });
  assert.equal(list.method, 'GET');
  assert.match(list.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/flows\?spaceCode=demo$/);
  assert.deepEqual(list.params, { spaceCode: 'demo' });

  const create = await dryRun(createBackfillJob, {
    spaceCode: 'demo',
    jobName: 'August backfill',
    flowCode: 1001,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
  });
  assert.equal(create.method, 'POST');
  assert.match(create.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/jobs$/);
  assert.deepEqual(create.body, {
    spaceCode: 'demo',
    jobName: 'August backfill',
    flowCode: 1001,
    jobType: 'TASK_ALL',
    failureStrategy: 'END',
    parallel: true,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    step: 1,
    unit: 'DAY',
    reverse: false,
  });

  const search = await dryRun(searchBackfillJobs, {
    spaceCode: 'demo',
    keyword: 'August',
    status: 'DRAFT,RUNNING',
    owners: ['ou_1'],
    sort: 'CREATE_TIME',
    sortAscending: true,
    pageNum: 2,
    pageSize: 50,
  });
  assert.equal(search.method, 'POST');
  assert.match(search.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/jobs\/search$/);
  assert.deepEqual(search.body, {
    spaceCode: 'demo',
    keyword: 'August',
    status: 'DRAFT,RUNNING',
    owners: ['ou_1'],
    sort: 'CREATE_TIME',
    sortAscending: true,
    pageNum: 2,
    pageSize: 50,
  });

  const detail = await dryRun(getBackfillJobDetail, { spaceCode: 'demo', jobId: 42 });
  assert.equal(detail.method, 'GET');
  assert.match(detail.url, /\/api\/cli\/dataops\/v1\/gaia\/operations\/backfill\/jobs\/detail\?spaceCode=demo&jobId=42$/);
  assert.deepEqual(detail.params, { spaceCode: 'demo', jobId: 42 });

  for (const [command, suffix] of [
    [runBackfillJob, 'run'],
    [stopBackfillJob, 'stop'],
    [rerunBackfillJob, 'rerun'],
  ] as const) {
    const action = await dryRun(command, { spaceCode: 'demo', jobId: 42 });
    assert.equal(action.method, 'POST');
    assert.match(action.url, new RegExp(`/api/cli/dataops/v1/gaia/operations/backfill/jobs/${suffix}$`));
    assert.deepEqual(action.body, { spaceCode: 'demo', jobId: 42 });
  }
});

await test('create sends a manual date subset with its explicit range', async () => {
  const custom = await dryRun(createBackfillJob, {
    spaceCode: 'demo',
    jobName: 'Selected dates',
    flowCode: 1001,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    completeDates: ['2026-08-01', '2026-08-03'],
  });
  assert.deepEqual(custom.body, {
    spaceCode: 'demo',
    jobName: 'Selected dates',
    flowCode: 1001,
    jobType: 'TASK_ALL',
    failureStrategy: 'END',
    parallel: true,
    completeDates: ['2026-08-01', '2026-08-03'],
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    reverse: false,
  });
  assert.ok(!('dateCustom' in (custom.body ?? {})));
  assert.ok(!('id' in (custom.body ?? {})));
  assert.ok(!('jobStatus' in (custom.body ?? {})));
});

await test('create rejects invalid identifiers, enums, times, and date modes locally', () => {
  const base = { spaceCode: 'demo', jobName: 'Backfill', flowCode: 1001 };
  const customBase = { ...base, startDate: '2026-08-01', endDate: '2026-08-03' };

  assertValidationError(createBackfillJob, base, /both --startDate and --endDate/i);
  assertValidationError(createBackfillJob, {
    ...base,
    completeDates: ['2026-08-01'],
  }, /both --startDate and --endDate/i);
  assertValidationError(createBackfillJob, { ...base, startDate: '2026-08-01' }, /both --startDate and --endDate/i);
  assertValidationError(createBackfillJob, {
    ...base,
    startDate: '2026-08-02',
    endDate: '2026-08-01',
  }, /must not be after/i);
  assertValidationError(createBackfillJob, {
    ...base,
    startDate: '2026-02-30',
    endDate: '2026-03-01',
  }, /valid date/i);
  assertValidationError(createBackfillJob, {
    ...base,
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    step: 0,
  }, /step.*positive integer/i);
  assertValidationError(createBackfillJob, {
    ...base,
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    unit: 'YEAR',
  }, /unit.*DAY, WEEK, or MONTH/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-08-01', '2026-08-01'],
  }, /duplicate/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-02-30'],
  }, /valid date/i);
  assertValidationError(createBackfillJob, { ...customBase, completeDates: [] }, /non-empty JSON array/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-08-04'],
  }, /inside --startDate and --endDate/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-08-01'],
    jobType: 'TASK_ONLY',
  }, /startNode.*required/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-08-01'],
    failureStrategy: 'RETRY',
  }, /failureStrategy.*END or CONTINUE/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    completeDates: ['2026-08-01'],
    stTime: '25:00:00',
  }, /stTime.*HH:mm:ss/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    flowCode: Number.MAX_SAFE_INTEGER + 1,
    completeDates: ['2026-08-01'],
  }, /flowCode.*positive safe integer/i);
  assertValidationError(createBackfillJob, {
    ...customBase,
    jobName: '   ',
    completeDates: ['2026-08-01'],
  }, /jobName.*non-empty/i);
});

await test('job actions reject unsafe job IDs before building a request', () => {
  for (const command of [runBackfillJob, getBackfillJobDetail, stopBackfillJob, rerunBackfillJob, deleteBackfillJob]) {
    for (const jobId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assertValidationError(command, { spaceCode: 'demo', jobId }, /jobId.*positive safe integer/i);
    }
  }
});

await test('search validates filters and omits every unspecified optional field', async () => {
  const minimal = await dryRun(searchBackfillJobs, { spaceCode: 'demo' });
  assert.deepEqual(minimal.body, { spaceCode: 'demo' });

  assertValidationError(searchBackfillJobs, {
    spaceCode: 'demo',
    startDate: '2026-08-02',
    endDate: '2026-08-01',
  }, /must not be after/i);
  assertValidationError(searchBackfillJobs, { spaceCode: 'demo', jobType: 'ALL' }, /jobType/i);
  assertValidationError(searchBackfillJobs, { spaceCode: 'demo', status: 'SUCCESS,UNKNOWN' }, /status/i);
  assertValidationError(searchBackfillJobs, { spaceCode: 'demo', owners: ['ou_1', 2] }, /owners.*strings/i);
  assertValidationError(searchBackfillJobs, { spaceCode: 'demo', sort: 'OWNER' }, /sort/i);

  const flags = new Map(searchBackfillJobs.flags.map((flag) => [flag.name, flag]));
  assert.equal(flags.get('pageNum')?.min, 1);
  assert.equal(flags.get('pageSize')?.min, 1);
  assert.equal(flags.get('pageSize')?.max, 100);
});

await test('agent docs describe the lifecycle boundary and Transitional exit', async () => {
  const [skill, reference] = await Promise.all([
    readFile(new URL('../skills/ae-dataops/SKILL.md', import.meta.url), 'utf8'),
    readFile(new URL('../skills/ae-dataops/references/dataops-backfill.md', import.meta.url), 'utf8'),
  ]);

  assert.match(skill, /dataops-backfill/);
  assert.match(skill, /\+create_backfill_job/);
  assert.match(skill, /\+update_backfill_job/);
  assert.match(skill, /\+delete_backfill_job/);
  assert.match(reference, /create a draft[\s\S]*run[\s\S]*detail/i);
  assert.match(reference, /update is a complete replacement, not a partial patch/i);
  assert.match(reference, /deletion is high-risk/i);
  assert.match(reference, /does not create a new backfill job/i);
  assert.match(reference, /does not support rerunning only failed plans/i);
  assert.match(reference, /every selected date must be inside that inclusive range/i);
  assert.match(reference, /only when the job is `FAIL` or `STOP`/);
  assert.match(reference, /`SUCCESS` job cannot be rerun/);
  assert.match(reference, /Transition status: transitional/);
  assert.match(reference, /Owning module: Gaia operations/);
  assert.match(reference, /Current transport: DataOps CLI REST/);
  assert.match(reference, /Gateway target: TBD/);
  assert.match(reference, /Review after: 2026-11-20/);
  assert.match(reference, /Exit condition:/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
