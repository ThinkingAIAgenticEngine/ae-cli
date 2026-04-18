import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSchemas: Command = {
  service: 'dataops_repo',
  command: '+list_schemas',
  description: 'List schema/database list under specified catalog, returns schema names',
  flags: [
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code' },
    { name: 'catalogName', type: 'string', required: true, desc: 'Catalog name' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_schemas', {
      repoCode: ctx.str('repoCode'),
      catalogName: ctx.str('catalogName'),
    });
    return parseMcpResult(result);
  },
};