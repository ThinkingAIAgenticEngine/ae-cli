import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getCorpusTags: Command = {
  service: 'community',
  command: '+get_corpus_tags',
  description: 'List corpus tags (tagId, tagCode, tagName, inferenceType) to pick tagCode for filters.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const host = ctx.host();

    const param = { gameId };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_corpus_tags', args, host);
    return parseMcpResult(result);
  },
};