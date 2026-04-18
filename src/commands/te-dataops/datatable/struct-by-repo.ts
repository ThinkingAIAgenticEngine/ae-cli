import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const structByRepo: Command = {
  service: 'dataops_datatable',
  command: '+struct_by_repo',
  description: 'Get table hierarchy structure by repository dimension (repo→catalog→schema→tables). Returns: Flattened hierarchy list including repoCode, catalogName, schemaName, tables. Applicable for browsing full overview of space data assets',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'search', type: 'string', required: false, desc: 'Search keyword (optional, for filtering results)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_struct_by_repo', {
      spaceCode: ctx.str('spaceCode'),
      search: ctx.str('search'),
    });
    return parseMcpResult(result);
  },
};