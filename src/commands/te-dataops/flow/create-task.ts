import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const createTask: Command = {
  service: 'dataops_flow',
  command: '+create_task',
  description: 'Create a task node in a task flow. Write operation requires two-step confirmation. taskType options: TRINO_SQL (Trino SQL query task), SHELL (Shell script task), FLOW_CHECK (Flow check node), TASK_CHECK (Task check node), OFFLINE_SYNC (Offline data sync), APP_sync (Application data sync), PLACE_HOLDER (Placeholder node). When taskType is OFFLINE_SYNC or APP_SYNC, you can specify the sync solution to bind via syncId parameter. Returns: taskCode, taskName, taskType. Related tools: flow_save_task_definition (save task definition), flow_add_task_relation (add dependency)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    { name: 'taskType', type: 'string', required: true, desc: 'Task type: TRINO_SQL, SHELL, FLOW_CHECK, TASK_CHECK, OFFLINE_SYNC, APP_SYNC, PLACE_HOLDER' },
    { name: 'syncId', type: 'string', required: false, desc: 'Sync solution ID (valid only when taskType is OFFLINE_SYNC or APP_SYNC)' },
    { name: 'preTaskCode', type: 'number', required: false, desc: 'Pre-task code (upstream dependency)' },
    { name: 'owner', type: 'string', required: false, desc: 'Owner openId' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_create_task', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      taskName: ctx.str('taskName'),
      taskType: ctx.str('taskType'),
      preTaskCode: ctx.num('preTaskCode'),
      owner: ctx.str('owner'),
      remark: ctx.str('remark'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};