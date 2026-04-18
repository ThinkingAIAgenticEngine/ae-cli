import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber, readOptionalString, requireAnyFlag } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'modify_flow_base_info';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    flowUuid: ctx.str('flow-uuid'),
  };
  const flowName = readOptionalString(ctx, 'flow-name');
  if (flowName) args.flowName = flowName;
  const flowDesc = readOptionalString(ctx, 'flow-desc');
  if (flowDesc) args.flowDesc = flowDesc;
  const groupId = readOptionalNumber(ctx, 'group-id');
  if (groupId !== undefined) args.groupId = groupId;
  return args;
}

export const modifyFlowBaseInfo: Command = {
  service: 'te-engage',
  command: '+modify-flow-base-info',
  description: 'Modify the basic information of a flow canvas.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'flow-uuid', type: 'string', required: true, desc: 'Flow UUID' },
    { name: 'flow-name', type: 'string', required: false, desc: 'New flow name' },
    { name: 'flow-desc', type: 'string', required: false, desc: 'New flow description' },
    { name: 'group-id', type: 'number', required: false, desc: 'New group ID' },
  ],
  risk: 'write',
  validate: (ctx) => {
    requireAnyFlag(ctx, ['flow-name', 'flow-desc', 'group-id']);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
