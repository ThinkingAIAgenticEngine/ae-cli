import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalString, readRequiredJsonArray } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'batch_manage_flow';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    action: ctx.str('action'),
  };
  const flowList = readOptionalJsonArray(ctx, 'flow_list');
  if (flowList !== undefined) args.flowList = flowList;
  const pauseFlowList = readOptionalJsonArray(ctx, 'pause_flow_list');
  if (pauseFlowList !== undefined) args.pauseFlowList = pauseFlowList;
  const flowIdList = readOptionalJsonArray(ctx, 'flow_id_list');
  if (flowIdList !== undefined) args.flowIdList = flowIdList;
  const reason = readOptionalString(ctx, 'reason');
  if (reason) args.reason = reason;
  return args;
}

export const manageFlow: Command = {
  service: 'engage',
  command: '+manage_flow',
  description: 'Batch manage flows with one unified command.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'action', type: 'string', required: true, desc: 'Action type' },
    { name: 'flow_list', type: 'json', required: false, desc: 'Flow approval list as JSON array' },
    { name: 'pause_flow_list', type: 'json', required: false, desc: 'Pause flow list as JSON array' },
    { name: 'flow_id_list', type: 'json', required: false, desc: 'Flow ID list as JSON array' },
    { name: 'reason', type: 'string', required: false, desc: 'Reason for review actions' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const action = ctx.str('action');
    if (['approve', 'deny', 'cancel'].includes(action)) {
      readRequiredJsonArray(ctx, 'flow_list');
    }
    if (action === 'pause') {
      readRequiredJsonArray(ctx, 'pause_flow_list');
    }
    if (['recover', 'end'].includes(action)) {
      readRequiredJsonArray(ctx, 'flow_id_list');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
