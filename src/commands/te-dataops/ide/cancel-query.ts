import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const cancelQuery: Command = {
  service: 'dataops_ide',
  command: '+cancel_query',
  description: 'Cancels a running async SQL query. Write operation requires two-step confirmation. Query results will be unavailable after cancellation',
  flags: [
    { name: 'requestId', type: 'string', required: true, desc: 'Request ID returned after executing SQL' },
    { name: 'confirmed', type: 'boolean', required: true, desc: 'Whether confirmed to execute. First call: omit or pass false for preview, then pass true to execute' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_cancel_query', {
      requestId: ctx.str('requestId'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};