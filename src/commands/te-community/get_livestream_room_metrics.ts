import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamRoomMetrics: Command = {
  service: 'community',
  command: '+get_livestream_room_metrics',
  description: 'Core metrics and yearly calendar for one room: overview KPIs plus daily streamed-duration calendar.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'channel-id', type: 'int64', required: true, min: 1, desc: 'Channel ID from +get_livestream_rooms.' },
    { name: 'room-id', type: 'string', required: true, desc: 'Live room ID (roomId) from +get_livestream_rooms.' },
    { name: 'year', type: 'string', required: false, desc: 'Calendar year (yyyy).' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const channelId = ctx.int64('channel-id');
    const roomId = ctx.str('room-id');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, channelId, roomId };

    const year = ctx.str('year');
    if (year) param.year = year;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_livestream_room_metrics', args, host);
    return parseMcpResult(result);
  },
};