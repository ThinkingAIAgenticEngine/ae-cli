import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getTopicDetail: Command = {
  service: 'community',
  command: '+get_topic_detail',
  description: 'Deep stats for one topic in a range: content/reply totals, sentiment, per-channel daily trends, hot keywords.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'topic-id', type: 'string', required: true, desc: 'Topic ID from +get_hot_topics (topicId).' },
    { name: 'start-time', type: 'string', required: true, desc: 'Statistics start date. Format: yyyy-MM-dd. Prefer topic startTime from +get_hot_topics.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Statistics end date. Format: yyyy-MM-dd. Prefer topic endTime from +get_hot_topics.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
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