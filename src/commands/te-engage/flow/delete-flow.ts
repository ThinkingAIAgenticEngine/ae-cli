import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonArray } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'batch_delete_flow';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    flowUuidList: readRequiredJsonArray(ctx, 'flow_uuid_list'),
  };
}

export const deleteFlow: Command = {
  service: 'engage',
  command: '+delete_flow',
  description: 'Batch delete flows.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'flow_uuid_list', type: 'json', required: true, desc: 'Flow UUID list as JSON array' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonArray(ctx, 'flow_uuid_list');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
