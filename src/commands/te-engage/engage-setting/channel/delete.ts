import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Deletes a disabled channel. */
export const channelDelete = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'delete',
  capabilityId: 'engage-setting.channel.delete',
  description: 'Delete a disabled channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), channel_id: ctx.str('channel-id') }),
});
