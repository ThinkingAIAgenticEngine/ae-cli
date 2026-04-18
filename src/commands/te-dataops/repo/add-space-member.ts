import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const addSpaceMember: Command = {
  service: 'dataops_repo',
  command: '+add_space_member',
  description: 'Add new members to space and assign roles. Write operation requires two-step confirmation: First call returns operation preview, set confirmed=true to execute after confirmation. Available roles typically include: Space Administrator, Developer, Operations, Read-only Member (specific roles vary by deployment)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'userIds', type: 'string', required: true, desc: 'User ID list, comma-separated integers' },
    { name: 'roleNames', type: 'string', required: true, desc: 'Role name list, comma-separated' },
    { name: 'confirmed', type: 'boolean', required: true, desc: 'Whether confirmed to execute. First call without this parameter or with false for preview, pass true to execute after confirmation' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_add_space_member', {
      spaceCode: ctx.str('spaceCode'),
      userIds: ctx.str('userIds'),
      roleNames: ctx.str('roleNames'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};