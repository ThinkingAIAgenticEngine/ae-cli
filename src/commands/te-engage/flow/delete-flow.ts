import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonArray } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'batch_delete_flow';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    flowUuidList: readRequiredJsonArray(ctx, 'flow-uuid-list'),
  };
}

export const deleteFlow: Command = {
  service: 'te-engage',
  command: '+delete-flow',
  description: 'Batch delete flows.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'flow-uuid-list', type: 'json', required: true, desc: 'Flow UUID list as JSON array' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonArray(ctx, 'flow-uuid-list');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
