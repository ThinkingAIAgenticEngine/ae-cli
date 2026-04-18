import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamRoomMetrics: Command = {
  service: 'community',
  command: 'get_livestream_room_metrics',
  description: 'Core metrics and yearly calendar for one room: overview KPIs plus daily streamed-duration calendar.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'channel-id', type: 'number', required: true, desc: 'Channel ID from get_livestream_rooms.' },
    { name: 'room-id', type: 'string', required: true, desc: 'Live room ID (roomId) from get_livestream_rooms.' },
    { name: 'year', type: 'string', required: false, desc: 'Calendar year (yyyy).' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const channelId = ctx.num('channel-id');
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
