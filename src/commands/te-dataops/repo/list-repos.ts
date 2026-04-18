import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listRepos: Command = {
  service: 'dataops_repo',
  command: '+list_repos',
  description: 'List repositories visible to current user. Returns: repoCode (repository code), repoName (repository name), repoType (repository type). Applicable for scenarios requiring data warehouse connection selection',
  flags: [],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_repos', {});
    return parseMcpResult(result);
  },
};