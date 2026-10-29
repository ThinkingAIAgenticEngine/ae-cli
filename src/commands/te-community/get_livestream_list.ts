import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamList: Command = {
  service: 'community',
  command: '+get_livestream_list',
  description: 'List live sessions for a room in a time range (stream records).',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'channel-id', type: 'int64', required: false, min: 1, desc: 'Channel ID from +get_livestream_rooms.' },
    { name: 'room-id', type: 'string', required: false, desc: 'Live room ID (roomId) from +get_livestream_rooms.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Statistics range end (inclusive). Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const host = ctx.host();

    const param: Record<string, any> = { gameId };

    const channelId = ctx.int64('channel-id');
    if (channelId) param.channelId = channelId;

    const roomId = ctx.str('room-id');
    if (roomId) param.roomId = roomId;

    const startTime = ctx.str('start-time');
    if (startTime) param.startTime = startTime;

    const endTime = ctx.str('end-time');
    if (endTime) param.endTime = endTime;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_livestream_list', args, host);
    return parseMcpResult(result);
  },
};