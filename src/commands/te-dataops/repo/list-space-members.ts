import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSpaceMembers: Command = {
  service: 'dataops_repo',
  command: '+list_space_members',
  description: 'List space members. Returns: member names, roles, join time. Applicable for viewing space members and permission allocation',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_space_members', {
      spaceCode: ctx.str('spaceCode'),
    });
    return parseMcpResult(result);
  },
};