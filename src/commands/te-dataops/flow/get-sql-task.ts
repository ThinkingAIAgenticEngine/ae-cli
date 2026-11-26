import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requirePositiveSafeInt, requireSpaceCode } from './task-output-param-options.js';

const toolName = 'flow_get_sql_task';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: requireSpaceCode(ctx),
    flowCode: requirePositiveSafeInt(ctx, 'flowCode'),
    taskCode: requirePositiveSafeInt(ctx, 'taskCode'),
  };
}

export const getSqlTask: Command = {
  service: 'dataops_flow',
  command: '+get_sql_task',
  description: 'Get the DEV definition of one Trino SQL task node (taskType=TRINO_SQL). Requires spaceCode, flowCode, and taskCode. Returns sqlTask (sql, preSql, postSql), preTasks, retry policy, outputParams, taskParams, and paramSources. For historical PROD execution snapshots, use dataops_operations +get_task_instance_detail.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Trino SQL task node code' },
  ],
  risk: 'read',
  validate: (ctx) => {
    buildArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
