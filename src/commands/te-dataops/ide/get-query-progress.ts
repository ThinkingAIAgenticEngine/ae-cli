import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getQueryProgress: Command = {
  service: 'dataops_ide',
  command: '+get_query_progress',
  description: 'Queries async SQL execution progress. Returns: state(QUEUED/RUNNING/FINISHED/FAILED/CANCELLED), progress(percentage), message. Recommend 2-5 second polling interval. Call ide_get_query_result when state=FINISHED',
  flags: [
    { name: 'requestId', type: 'string', required: true, desc: 'Request ID returned after executing SQL' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_get_query_progress', {
      requestId: ctx.str('requestId'),
    });
    return parseMcpResult(result);
  },
};