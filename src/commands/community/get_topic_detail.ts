import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getTopicDetail: Command = {
  service: 'community',
  command: 'get_topic_detail',
  description: 'Deep stats for one topic in a range: content/reply totals, sentiment, per-channel daily trends, hot keywords.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'topic-id', type: 'string', required: true, desc: 'Topic ID from get_hot_topics (topicId).' },
    { name: 'start-time', type: 'string', required: true, desc: 'Statistics start date. Format: yyyy-MM-dd. Prefer topic startTime from get_hot_topics.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Statistics end date. Format: yyyy-MM-dd. Prefer topic endTime from get_hot_topics.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const topicId = ctx.str('topic-id');
    const startTime = ctx.str('start-time');
    const endTime = ctx.str('end-time');
    const host = ctx.host();

    const param = { gameId, topicId, startTime, endTime };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_hot');
    const result = await callMcpTool(mcpUrl, 'get_topic_detail', args, host);
    return parseMcpResult(result);
  },
};
