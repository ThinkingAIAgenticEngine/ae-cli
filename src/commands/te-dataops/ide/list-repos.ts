import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listRepos: Command = {
  service: 'dataops_ide',
  command: '+ide_list_repos',
  description: 'Lists available data warehouses in the space. Returns: repoCode(repository code), repoName(repository name), connType(connection type: SPACE/ETL/APP). SPACE for daily query development, ETL for data processing, APP for external services',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_list_repos', {
      spaceCode: ctx.str('spaceCode'),
    });
    return parseMcpResult(result);
  },
};