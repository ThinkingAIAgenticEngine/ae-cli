import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'operations_stop_flow_instance';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  const executeId = ctx.optionalNum('executeId');
  const flowInstanceId = ctx.optionalNum('flowInstanceId');
  if ((executeId == null && flowInstanceId == null) || (executeId != null && flowInstanceId != null)) {
    throw new Error('Pass exactly one of --executeId or --flowInstanceId');
  }
  if ((executeId != null && executeId <= 0) || (flowInstanceId != null && flowInstanceId <= 0)) {
    throw new Error('--executeId and --flowInstanceId must be positive numbers');
  }
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    executeId,
    flowInstanceId,
  };
}

export const stopFlowInstance: Command = {
  service: 'dataops_operations',
  command: '+stop_flow_instance',
  description: 'Stop a running workflow execution. Requires spaceCode, flowCode, and exactly one selector: executeId from dataops_flow +execute_flow or flowInstanceId from dataops_operations +search_flow_instances. Returns success, selector, and selector-specific stop result.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'executeId', type: 'number', required: false, desc: 'Execution ID from dataops_flow +execute_flow; use before flowInstanceId is available' },
    { name: 'flowInstanceId', type: 'number', required: false, desc: 'Workflow instance ID returned by dataops_operations +search_flow_instances' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
