import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSpaces: Command = {
  service: 'dataops_repo',
  command: '+list_spaces',
  description: 'List spaces current user has permission to access. Returns: spaceCode (space code), spaceName (space name), description (description). This is the entry point for the entire MCP toolchain, spaceCode is a required parameter for most other tools. If user only has one space, it can be automatically selected',
  flags: [],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_spaces', {});
    return parseMcpResult(result);
  },
};