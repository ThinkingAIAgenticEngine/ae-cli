import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listCatalogs: Command = {
  service: 'dataops_ide',
  command: '+ide_list_catalogs',
  description: 'Lists all catalogs and their schemas in the repository. Returns: catalogs(list containing catalogName and schemas sub-list). Requires repoCode (obtainable via ide_list_repos)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_list_catalogs', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
    });
    return parseMcpResult(result);
  },
};