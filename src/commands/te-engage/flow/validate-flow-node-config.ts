import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'validate_flow_node_config';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    nodeType: ctx.str('node_type'),
    config: ctx.str('config'),
    operationMode: ctx.str('operation_mode'),
  };
}

export const validateFlowNodeConfig: Command = {
  service: 'engage',
  command: '+validate_flow_node_config',
  description: 'Validate and normalize one candidate node config before placing it into save_flow.',
  flags: [
    { name: 'node_type', type: 'string', required: true, desc: 'Flow node type, for example single_trigger, event_trigger, event_split_flow, or message_push' },
    { name: 'config', type: 'string', required: true, desc: 'Node config JSON object encoded as a string' },
    { name: 'operation_mode', type: 'string', required: true, desc: 'Validation mode. Use save_flow for the current exposed MCP protocol; save_submit_flow applies stricter submit-time checks' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
