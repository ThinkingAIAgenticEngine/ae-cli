import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listCatalogs: Command = {
  service: 'dataops_repo',
  command: '+list_catalogs',
  description: 'List catalogs under specified repository, returns catalog names and permission information. Applicable for browsing repository structure. Difference from ide_list_catalogs: This tool is repository management oriented, ide_list_catalogs is query IDE operation oriented',
  flags: [
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, like te_etl' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_catalogs', {
      repoCode: ctx.str('repoCode'),
    });
    return parseMcpResult(result);
  },
};