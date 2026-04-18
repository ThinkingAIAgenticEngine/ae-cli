import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'cancel_query_by_request_id';

function buildArgs(ctx: any): Record<string, any> {
  return { requestId: ctx.str('request_id') };
}

export const cancelQueryByRequestId: Command = {
  service: 'engage',
  command: '+cancel_query_by_request_id',
  description: 'Cancel a running report query by request ID.',
  flags: [{ name: 'request_id', type: 'string', required: true, desc: 'Request ID to cancel' }],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
