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
  description: 'Validate one node config before save_flow.',
  flags: [
    { name: 'node_type', type: 'string', required: true, desc: 'Node type' },
    { name: 'config', type: 'string', required: true, desc: 'Node config JSON string' },
    { name: 'operation_mode', type: 'string', required: true, desc: 'Validation mode' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
