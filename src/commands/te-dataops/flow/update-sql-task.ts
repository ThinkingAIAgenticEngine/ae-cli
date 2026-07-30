import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  updateTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';

const toolName = 'flow_update_sql_task';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
    sql: ctx.str('sql'),
    preSql: ctx.str('preSql'),
    postSql: ctx.str('postSql'),
    ...buildTaskWriteArgs(ctx),
  };
}

export const updateSqlTask: Command = {
  service: 'dataops_flow',
  command: '+update_sql_task',
  description: 'Update an existing DEV Trino SQL task. Requires spaceCode, flowCode, taskCode, and sql; omitted SQL hooks, dependencies, and retry fields keep existing values. Returns action/result/status; result includes sqlSaved, flowCode, taskCode, taskType=TRINO_SQL, and task',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Trino SQL task code' },
    { name: 'sql', type: 'string', required: true, desc: 'Main Trino SQL content' },
    { name: 'preSql', type: 'string', required: false, desc: 'Optional SQL to run before the main SQL. Omit to keep existing preSql' },
    { name: 'postSql', type: 'string', required: false, desc: 'Optional SQL to run after the main SQL. Omit to keep existing postSql' },
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: validateTaskWriteArgs,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
