import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'query_flow_node_config_schema';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { nodeType: ctx.str('node-type') };
}

export const flowNodeConfigSchema: Command = {
  service: 'te-engage',
  command: '+flow-node-config-schema',
  description: 'Query the config schema for one flow node type.',
  flags: [{ name: 'node-type', type: 'string', required: true, desc: 'Node type' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
