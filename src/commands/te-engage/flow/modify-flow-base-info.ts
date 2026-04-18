import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber, readOptionalString, requireAnyFlag } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'modify_flow_base_info';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    flowUuid: ctx.str('flow_uuid'),
  };
  const flowName = readOptionalString(ctx, 'flow_name');
  if (flowName) args.flowName = flowName;
  const flowDesc = readOptionalString(ctx, 'flow_desc');
  if (flowDesc) args.flowDesc = flowDesc;
  const groupId = readOptionalNumber(ctx, 'group_id');
  if (groupId !== undefined) args.groupId = groupId;
  return args;
}

export const modifyFlowBaseInfo: Command = {
  service: 'engage',
  command: '+modify_flow_base_info',
  description: 'Modify the basic information of a flow canvas.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'flow_uuid', type: 'string', required: true, desc: 'Flow UUID' },
    { name: 'flow_name', type: 'string', required: false, desc: 'New flow name' },
    { name: 'flow_desc', type: 'string', required: false, desc: 'New flow description' },
    { name: 'group_id', type: 'number', required: false, desc: 'New group ID' },
  ],
  risk: 'write',
  validate: (ctx) => {
    requireAnyFlag(ctx, ['flow_name', 'flow_desc', 'group_id']);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
