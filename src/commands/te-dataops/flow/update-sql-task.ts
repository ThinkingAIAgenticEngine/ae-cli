import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  updateTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';
import {
  createOutputParamsFlag,
  explicitString,
  resolveTaskOutputParams,
} from './task-output-param-options.js';

const toolName = 'flow_update_sql_task';

function buildArgs(ctx: RuntimeContext) {
  const sql = explicitString(ctx, 'sql');
  if (sql !== undefined && !sql.trim()) {
    throw new CliValidationError('--sql must not be empty');
  }
  const preSql = explicitString(ctx, 'preSql');
  const postSql = explicitString(ctx, 'postSql');
  const outputParams = resolveTaskOutputParams(ctx);
  const taskWriteArgs = buildTaskWriteArgs(ctx);

  const mutableValues = [
    sql,
    preSql,
    postSql,
    outputParams,
    ...Object.values(taskWriteArgs),
  ];
  if (mutableValues.every((value) => value === undefined)) {
    throw new CliValidationError(
      'Pass at least one update field (--sql, --preSql, --postSql, --outputParams, --preTasks, or retry flags)',
    );
  }

  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
    sql,
    preSql,
    postSql,
    outputParams,
    ...taskWriteArgs,
  };
}

export const updateSqlTask: Command = {
  service: 'dataops_flow',
  command: '+update_sql_task',
  description: 'Partially update an existing DEV Trino SQL task. Requires spaceCode, flowCode, taskCode, and at least one mutable field; omitted sql, preSql, postSql, outputParams, dependencies, and retry fields keep existing values. Pass --preSql "" or --postSql "" to clear hooks; outputParams and preTasks use three-state semantics (omit to keep, [] clears, non-empty replaces). Returns action/result/status; result includes sqlSaved, flowCode, taskCode, taskType=TRINO_SQL, and task',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Trino SQL task code' },
    { name: 'sql', type: 'string', required: false, desc: 'Optional main Trino SQL content. Omit to keep existing SQL' },
    { name: 'preSql', type: 'string', required: false, desc: 'Optional SQL to run before the main SQL. Omit to keep existing preSql; pass "" to clear' },
    { name: 'postSql', type: 'string', required: false, desc: 'Optional SQL to run after the main SQL. Omit to keep existing postSql; pass "" to clear' },
    createOutputParamsFlag('Optional JSON array of OUT parameter declarations [{"paramKey":"out_dt","remark":"optional"}]. Omit to keep existing; pass [] to clear; non-empty replaces (requires SELECT query SQL)'),
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateTaskWriteArgs(ctx);
    buildArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
