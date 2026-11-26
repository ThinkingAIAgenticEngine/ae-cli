import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  createTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';
import { createOutputParamsFlag, resolveTaskOutputParams } from './task-output-param-options.js';

const toolName = 'flow_create_sql_task';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskName: ctx.str('taskName'),
    sql: ctx.str('sql'),
    preSql: ctx.str('preSql'),
    postSql: ctx.str('postSql'),
    outputParams: resolveTaskOutputParams(ctx),
    remark: ctx.str('remark'),
    ...buildTaskWriteArgs(ctx),
  };
}

export const createSqlTask: Command = {
  service: 'dataops_flow',
  command: '+create_sql_task',
  description: 'Create a DEV Trino SQL task and save its SQL. Requires spaceCode, flowCode, taskName, and sql; SQL hooks, OUT parameter declarations (outputParams, requires SELECT query SQL), dependencies, retry policy, and remark are optional. Returns action/result/status; result includes flowCode, taskCode, taskName, taskType=TRINO_SQL, and sqlSaved=true',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    { name: 'sql', type: 'string', required: true, desc: 'Trino SQL content for the task' },
    { name: 'preSql', type: 'string', required: false, desc: 'Optional SQL to run before the main SQL' },
    { name: 'postSql', type: 'string', required: false, desc: 'Optional SQL to run after the main SQL' },
    createOutputParamsFlag('Optional JSON array of OUT parameter declarations [{"paramKey":"out_dt","remark":"optional"}] (VARCHAR only; requires a query SQL such as SELECT)'),
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    ...createTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateTaskWriteArgs(ctx);
    resolveTaskOutputParams(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
