import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamAnalysis: Command = {
  service: 'community',
  command: '+get_livestream_analysis',
  description:
    'AI-generated live session analysis report: highlight moments (time slices with metrics and AI insights) and sentiment opinions.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'stream-id', type: 'string', required: true, desc: 'Live session ID (streamId) from +get_livestream_list.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const streamId = ctx.str('stream-id');
    const host = ctx.host();

    const param = { gameId, streamId };
    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_livestream_analysis', args, host);
    return parseMcpResult(result);
  },
};