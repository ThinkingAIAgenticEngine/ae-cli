import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'cancel_query_by_request_id';

function buildArgs(ctx: any): Record<string, any> {
  return { requestId: ctx.str('request-id') };
}

export const cancelQueryByRequestId: Command = {
  service: 'te-engage',
  command: '+cancel-query-by-request-id',
  description: 'Cancel a running report query by request ID.',
  flags: [{ name: 'request-id', type: 'string', required: true, desc: 'Request ID to cancel' }],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
