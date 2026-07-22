import { createEngageSettingCapabilityCommand } from '../../shared.js';
import { readOptionalJsonArray, readOptionalNumber } from '../../utils.js';

/** Queries channels in a project. */
export const channelList = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'list',
  capabilityId: 'engage-setting.channel.list',
  description: 'Query channels in a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'provider-list', type: 'json', required: false, desc: 'Channel provider subtype JSON array.' },
    { name: 'channel-status', type: 'number', required: false, desc: 'Channel status: 0 disabled, 1 enabled.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    ...(readOptionalJsonArray(ctx, 'provider-list') !== undefined
      && { provider_list: readOptionalJsonArray(ctx, 'provider-list') }),
    ...(readOptionalNumber(ctx, 'channel-status') !== undefined
      && { channel_status: readOptionalNumber(ctx, 'channel-status') }),
  }),
});
