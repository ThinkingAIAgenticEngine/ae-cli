import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'operations_get_flow_instance_detail';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    flowInstanceId: ctx.num('flowInstanceId'),
  };
}

export const getFlowInstanceDetail: Command = {
  service: 'dataops_operations',
  command: '+get_flow_instance_detail',
  description: 'Get one workflow instance detail from the operations perspective. Use after +search_flow_instances returns flowCode and flowInstanceId. Returns flowInstance, tasks, relations, taskInstances, and summary for troubleshooting.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code from +search_flow_instances' },
    { name: 'flowInstanceId', type: 'number', required: true, desc: 'Workflow instance ID from +search_flow_instances' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
