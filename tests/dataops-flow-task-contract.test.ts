/**
 * DataOps flow task command contract tests.
 *
 * Run:
 *   npx tsx tests/dataops-flow-task-contract.test.ts
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Command, DryRunResult, RuntimeContext } from '../src/framework/types.js';
import { createSqlTask } from '../src/commands/te-dataops/flow/create-sql-task.js';
import { updateSqlTask } from '../src/commands/te-dataops/flow/update-sql-task.js';
import { createIntegrationTask } from '../src/commands/te-dataops/flow/create-integration-task.js';
import { updateIntegrationTask } from '../src/commands/te-dataops/flow/update-integration-task.js';
import { createWorkflowInstanceCheckTask } from '../src/commands/te-dataops/flow/create-workflow-instance-check-task.js';
import { updateWorkflowInstanceCheckTask } from '../src/commands/te-dataops/flow/update-workflow-instance-check-task.js';
import { createTaskInstanceCheckTask } from '../src/commands/te-dataops/flow/create-task-instance-check-task.js';
import { updateTaskInstanceCheckTask } from '../src/commands/te-dataops/flow/update-task-instance-check-task.js';
import { deleteTask } from '../src/commands/te-dataops/flow/delete-task.js';
import flowCommands from '../src/commands/te-dataops/flow/index.js';

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
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === '' ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => 'http://example.test',
    mcpUrl: () => undefined,
    service: () => 'dataops_flow',
    out: async () => undefined,
  };
}

async function runDryRun(command: Command, context: RuntimeContext): Promise<DryRunResult> {
  const result = await command.dryRun?.(context);
  assert.ok(result, `${command.command} must implement dryRun`);
  return result;
}

async function dryRunBody(
  command: Command,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return (await runDryRun(command, ctx(values))).body ?? {};
}

const existingCommands = [createSqlTask, updateSqlTask, createIntegrationTask, updateIntegrationTask];
const allCommands = [
  ...existingCommands,
  createWorkflowInstanceCheckTask,
  updateWorkflowInstanceCheckTask,
  createTaskInstanceCheckTask,
  updateTaskInstanceCheckTask,
];

console.log('dataops flow task contract');

await test('all eight task commands expose preTasks and retry flags', () => {
  for (const command of allCommands) {
    const flags = new Map(command.flags.map((flag) => [flag.name, flag]));
    assert.equal(flags.get('preTasks')?.type, 'json', command.command);
    assert.equal(flags.get('failRetryTimes')?.type, 'number', command.command);
    assert.equal(flags.get('failRetryInterval')?.type, 'number', command.command);
    assert.equal(flags.get('failRetryUnit')?.type, 'string', command.command);
    assert.ok(!flags.has('preTaskCode'), command.command);
  }
});

await test('workflow instance check commands are registered', () => {
  const names = new Set(flowCommands.map((command) => command.command));
  assert.ok(names.has('+create_workflow_instance_check_task'));
  assert.ok(names.has('+update_workflow_instance_check_task'));
});

await test('task instance check create command is registered', () => {
  const names = new Set(flowCommands.map((command) => command.command));
  assert.ok(names.has('+create_task_instance_check_task'));
});

await test('delete task exposes the single-node high-risk POST contract', async () => {
  assert.equal(
    flowCommands.find((command) => command.command === '+delete_task'),
    deleteTask,
  );
  assert.equal(deleteTask.risk, 'high-risk-write');
  assert.deepEqual(
    deleteTask.flags.map(({ name, type, required }) => ({ name, type, required })),
    [
      { name: 'spaceCode', type: 'string', required: true },
      { name: 'flowCode', type: 'number', required: true },
      { name: 'taskCode', type: 'number', required: true },
    ],
  );

  const dryRun = await runDryRun(deleteTask, ctx({
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
  }));
  assert.equal(dryRun.method, 'POST');
  assert.match(dryRun.url, /\/workflow\/task-deletion$/);
  assert.deepEqual(dryRun.body, {
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
  });
});

await test('delete task rejects invalid identifiers before confirmation', () => {
  for (const [field, values] of [
    ['flowCode', [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]],
    ['taskCode', [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]],
  ] as const) {
    for (const value of values) {
      assert.throws(
        () => deleteTask.validate?.(ctx({
          spaceCode: 'demo',
          flowCode: field === 'flowCode' ? value : 1001,
          taskCode: field === 'taskCode' ? value : 2001,
        })),
        new RegExp(`${field}.*positive safe integer`),
      );
    }
  }
});

await test('task instance check create declares defaults and REST contract', async () => {
  const flags = new Map(createTaskInstanceCheckTask.flags.map((flag) => [flag.name, flag]));
  assert.equal(flags.get('relation')?.default, 'AND');
  assert.equal(flags.get('checkInterval')?.default, 10);
  assert.equal(flags.get('checkTime')?.default, 3);
  assert.equal(flags.get('failRetryTimes')?.default, 3);
  assert.equal(flags.get('failRetryInterval')?.default, 5);
  assert.equal(flags.get('failRetryUnit')?.default, 'MINUTE');

  const commandCtx = ctx({
    spaceCode: 'demo',
    flowCode: 1001,
    taskName: 'Wait for target tasks',
    checkItems: [
      { flowCode: 1001, taskCode: 2001, left: 1, right: 1, checkTimeUnit: 'DAY' },
      { flowCode: 1002, taskCode: 2002, left: 0, right: 0, checkTimeUnit: 'HOUR' },
    ],
    relation: 'OR',
    checkInterval: 10,
    checkTime: 3,
    failRetryTimes: 3,
    failRetryInterval: 5,
    failRetryUnit: 'MINUTE',
  });
  assert.doesNotThrow(() => createTaskInstanceCheckTask.validate?.(commandCtx));

  const dryRun = await runDryRun(createTaskInstanceCheckTask, commandCtx);
  assert.match(String(dryRun?.url), /task-instance-check-tasks$/);
  assert.deepEqual(dryRun?.body?.checkItems, [
    { flowCode: 1001, taskCode: 2001, left: 1, right: 1, checkTimeUnit: 'DAY' },
    { flowCode: 1002, taskCode: 2002, left: 0, right: 0, checkTimeUnit: 'HOUR' },
  ]);
});

await test('task instance check create requires a positive target taskCode', () => {
  assert.throws(
    () => createTaskInstanceCheckTask.validate?.(ctx({
      flowCode: 1001,
      checkItems: [{ flowCode: 1001, left: 1, right: 1, checkTimeUnit: 'DAY' }],
    })),
    /taskCode must be a positive integer/,
  );
  assert.throws(
    () => createTaskInstanceCheckTask.validate?.(ctx({
      flowCode: 1001,
      checkItems: [{
        flowCode: 1001,
        taskCode: 2001,
        left: 1,
        right: 1,
        checkTimeUnit: 'DAY',
        taskName: 'page-only',
      }],
    })),
    /unsupported field "taskName"/,
  );
});

await test('task instance check update is registered and distinguishes node and target task codes', () => {
  const names = new Set(flowCommands.map((command) => command.command));
  assert.ok(names.has('+update_task_instance_check_task'));

  const flags = new Map(updateTaskInstanceCheckTask.flags.map((flag) => [flag.name, flag]));
  assert.equal(flags.get('checkItems')?.required, true);
  assert.match(flags.get('taskCode')?.desc ?? '', /node code to update/i);
  assert.match(flags.get('checkItems')?.desc ?? '', /target task/i);
});

await test('task instance check update replaces items and preserves omitted optional fields', async () => {
  const commandCtx = ctx({
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
    checkItems: [
      { flowCode: 1001, taskCode: 2001, left: 1, right: 1, checkTimeUnit: 'MINUTE' },
    ],
  });
  assert.doesNotThrow(() => updateTaskInstanceCheckTask.validate?.(commandCtx));

  const dryRun = await runDryRun(updateTaskInstanceCheckTask, commandCtx);
  assert.match(String(dryRun?.url), /task-instance-check-task-definition$/);
  assert.deepEqual(dryRun?.body?.checkItems, [
    { flowCode: 1001, taskCode: 2001, left: 1, right: 1, checkTimeUnit: 'MINUTE' },
  ]);
  for (const omitted of [
    'relation',
    'checkInterval',
    'checkTime',
    'preTasks',
    'failRetryTimes',
    'failRetryInterval',
    'failRetryUnit',
  ]) {
    assert.ok(!(omitted in (dryRun?.body ?? {})), omitted);
  }

  const cleared = await dryRunBody(updateTaskInstanceCheckTask, {
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
    checkItems: [{ flowCode: 1002, taskCode: 2002, left: 0, right: 0, checkTimeUnit: 'DAY' }],
    preTasks: [],
  });
  assert.deepEqual(cleared.preTasks, []);
});

await test('create commands declare retry defaults', () => {
  for (const command of [
    createSqlTask,
    createIntegrationTask,
    createWorkflowInstanceCheckTask,
    createTaskInstanceCheckTask,
  ]) {
    const flags = new Map(command.flags.map((flag) => [flag.name, flag]));
    assert.equal(flags.get('failRetryTimes')?.default, 3, command.command);
    assert.equal(flags.get('failRetryInterval')?.default, 5, command.command);
    assert.equal(flags.get('failRetryUnit')?.default, 'MINUTE', command.command);
  }
});

await test('update omission preserves dependencies and empty array clears them', async () => {
  const omitted = await dryRunBody(updateSqlTask, {
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
    sql: 'SELECT 1',
  });
  const cleared = await dryRunBody(updateSqlTask, {
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
    sql: 'SELECT 1',
    preTasks: [],
  });

  assert.ok(!('preTasks' in omitted));
  assert.deepEqual(cleared.preTasks, []);
});

await test('workflow instance check create dry-run carries flat check config', async () => {
  const body = await dryRunBody(createWorkflowInstanceCheckTask, {
    spaceCode: 'demo',
    flowCode: 1001,
    taskName: 'Wait for upstream flows',
    checkItems: [
      { flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'DAY' },
      { flowCode: 1003, left: 2, right: 0, checkTimeUnit: 'HOUR' },
    ],
    relation: 'OR',
    checkInterval: 5,
    checkTime: 3,
    failRetryTimes: 3,
    failRetryInterval: 5,
    failRetryUnit: 'MINUTE',
  });

  assert.equal(body.relation, 'OR');
  assert.equal(body.checkInterval, 5);
  assert.equal(body.checkTime, 3);
  assert.deepEqual(body.checkItems, [
    { flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'DAY' },
    { flowCode: 1003, left: 2, right: 0, checkTimeUnit: 'HOUR' },
  ]);
  assert.match(String((await runDryRun(createWorkflowInstanceCheckTask, ctx({
    spaceCode: 'demo',
    flowCode: 1001,
    taskName: 'Wait',
    checkItems: [{ flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'DAY' }],
  }))).url), /workflow-instance-check-tasks$/);
  assert.match(String((await runDryRun(updateWorkflowInstanceCheckTask, ctx({
    spaceCode: 'demo',
    flowCode: 1001,
    taskCode: 2001,
    checkItems: [{ flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'DAY' }],
  }))).url), /workflow-instance-check-task-definition$/);
});

await test('workflow instance check validation rejects nested or page-only fields', () => {
  const invalid = ctx({
    checkItems: [{
      flowCode: 1002,
      left: 1,
      right: 1,
      checkTimeUnit: 'DAY',
      flowName: 'page-only',
    }],
  });

  assert.throws(() => createWorkflowInstanceCheckTask.validate?.(invalid), /unsupported field "flowName"/);
});

await test('workflow instance check validation enforces item and scalar bounds', () => {
  assert.throws(
    () => createWorkflowInstanceCheckTask.validate?.(ctx({ checkItems: [] })),
    /between 1 and 20 items/,
  );
  assert.throws(
    () => createWorkflowInstanceCheckTask.validate?.(ctx({
      checkItems: [{ flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'SECOND' }],
    })),
    /checkTimeUnit must be DAY, HOUR, or MINUTE/,
  );
});

await test('retry unit validation accepts only MINUTE', () => {
  assert.throws(
    () => updateIntegrationTask.validate?.(ctx({ flowCode: 1001, taskCode: 2001, failRetryUnit: 'SECOND' })),
    /failRetryUnit must be MINUTE/,
  );
});

await test('task write validation rejects duplicate dependencies', () => {
  assert.throws(
    () => updateSqlTask.validate?.(ctx({ preTasks: [1001, 1001] })),
    /preTasks must not contain duplicate task codes/,
  );
});

await test('workflow instance check validation rejects fractional check scalars', () => {
  assert.throws(
    () => updateWorkflowInstanceCheckTask.validate?.(ctx({
      checkItems: [{ flowCode: 1002, left: 1, right: 1, checkTimeUnit: 'DAY' }],
      checkInterval: 1.5,
    })),
    /checkInterval must be an integer/,
  );
});

await test('workflow instance check offsets allow zero only for another workflow', () => {
  assert.doesNotThrow(
    () => createWorkflowInstanceCheckTask.validate?.(ctx({
      flowCode: 1001,
      checkItems: [{ flowCode: 1002, left: 0, right: 0, checkTimeUnit: 'DAY' }],
    })),
  );
  assert.throws(
    () => createWorkflowInstanceCheckTask.validate?.(ctx({
      flowCode: 1001,
      checkItems: [{ flowCode: 1001, left: 0, right: 0, checkTimeUnit: 'DAY' }],
    })),
    /left must be an integer greater than or equal to 1/,
  );
});

await test('agent reference documents optional-array update semantics and transitional status', async () => {
  const reference = await readFile(
    new URL('../skills/ae-dataops/references/dataops-flow-create.md', import.meta.url),
    'utf8',
  );

  assert.match(reference, /Omit `--preTasks` on update to preserve existing dependencies/);
  assert.match(reference, /pass `--preTasks '\[\]'` to clear them/);
  assert.match(reference, /Transition status: transitional/);
  assert.match(reference, /workflow_instance_check/);
  assert.match(reference, /\+create_task_instance_check_task/);
  assert.match(reference, /\+update_task_instance_check_task/);
  assert.match(reference, /Task instance check create defaults are `relation=AND`, `checkInterval=10`, and `checkTime=3`/);
  assert.match(reference, /top-level `--taskCode` identifies the TASK_CHECK node to update/);
  assert.match(reference, /`checkItems\[\]\.taskCode` identifies a target task/);
  assert.match(reference, /flow_create_task_instance_check_task/);
  assert.match(reference, /flow_update_task_instance_check_task/);
});

await test('agent skill documents safe task deletion and transitional transport', async () => {
  const [skill, reference] = await Promise.all([
    readFile(new URL('../skills/ae-dataops/SKILL.md', import.meta.url), 'utf8'),
    readFile(
      new URL('../skills/ae-dataops/references/dataops-flow-create.md', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(skill, /\+delete_task/);
  assert.match(reference, /Verify the target with `\+get_flow_overview`/);
  assert.match(reference, /ae-cli dataops_flow \+delete_task[\s\S]*--dry-run/);
  assert.match(reference, /ae-cli dataops_flow \+delete_task[\s\S]*--yes/);
  assert.match(reference, /running DEV debug executions/);
  assert.match(reference, /does not reconnect upstream and downstream nodes/);
  assert.match(reference, /flow_delete_task/);
  assert.match(reference, /Review after: 2026-10-27/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
