import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  createTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';

const toolName = 'flow_create_sql_task';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskName: ctx.str('taskName'),
    sql: ctx.str('sql'),
    preSql: ctx.str('preSql'),
    postSql: ctx.str('postSql'),
    remark: ctx.str('remark'),
    ...buildTaskWriteArgs(ctx),
  };
}

export const createSqlTask: Command = {
  service: 'dataops_flow',
  command: '+create_sql_task',
  description: 'Create a DEV Trino SQL task and save its SQL. Requires spaceCode, flowCode, taskName, and sql; SQL hooks, dependencies, retry policy, and remark are optional. Returns action/result/status; result includes flowCode, taskCode, taskName, taskType=TRINO_SQL, and sqlSaved=true',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    { name: 'sql', type: 'string', required: true, desc: 'Trino SQL content for the task' },
    { name: 'preSql', type: 'string', required: false, desc: 'Optional SQL to run before the main SQL' },
    { name: 'postSql', type: 'string', required: false, desc: 'Optional SQL to run after the main SQL' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    ...createTaskWriteFlags,
  ],
  risk: 'write',
  validate: validateTaskWriteArgs,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
