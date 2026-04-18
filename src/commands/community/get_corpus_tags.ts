import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getCorpusTags: Command = {
  service: 'community',
  command: 'get_corpus_tags',
  description: 'List corpus tags (tagId, tagCode, tagName, inferenceType) to pick tagCode for filters.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const host = ctx.host();

    const param = { gameId };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_corpus_tags', args, host);
    return parseMcpResult(result);
  },
};
