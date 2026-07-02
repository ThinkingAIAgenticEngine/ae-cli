import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'operations_get_task_instance_detail';

function optionalBool(ctx: RuntimeContext, name: string): boolean | undefined {
  return ctx.str(name) === '' ? undefined : ctx.bool(name);
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    flowInstanceId: ctx.num('flowInstanceId'),
    taskCode: ctx.optionalNum('taskCode'),
    taskName: ctx.str('taskName'),
    includeLog: optionalBool(ctx, 'includeLog'),
  };
}

export const getTaskInstanceDetail: Command = {
  service: 'dataops_operations',
  command: '+get_task_instance_detail',
  description: 'Get one task instance detail. Requires spaceCode, flowCode, flowInstanceId, and either taskCode or exact taskName. taskCode wins when both are passed. includeLog defaults to false. Returns task, taskInstance, definition, and optional log.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code from +search_flow_instances' },
    { name: 'flowInstanceId', type: 'number', required: true, desc: 'Workflow instance ID from +search_flow_instances' },
    { name: 'taskCode', type: 'number', required: false, desc: 'Task code; preferred selector when known' },
    { name: 'taskName', type: 'string', required: false, desc: 'Exact task name, case-insensitive; used only when taskCode is omitted' },
    { name: 'includeLog', type: 'boolean', required: false, desc: 'Whether to include task logs. Default false' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
