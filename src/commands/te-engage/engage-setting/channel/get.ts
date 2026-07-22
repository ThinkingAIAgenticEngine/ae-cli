import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Gets one channel's details. */
export const channelGet = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'get',
  capabilityId: 'engage-setting.channel.get',
  description: 'Get one channel\'s details.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), channel_id: ctx.str('channel-id') }),
});
