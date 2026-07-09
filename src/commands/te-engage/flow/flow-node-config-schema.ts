import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'query_flow_node_config_schema';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { nodeType: ctx.str('node_type') };
}

export const flowNodeConfigSchema: Command = {
  service: 'engage',
  command: '+flow_node_config_schema',
  description: 'Query one type-specific node config schema before constructing save_flow nodes or nodeConfigs.',
  flags: [{ name: 'node_type', type: 'string', required: true, desc: 'Flow node type, for example single_trigger, event_trigger, event_split_flow, or message_push' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
