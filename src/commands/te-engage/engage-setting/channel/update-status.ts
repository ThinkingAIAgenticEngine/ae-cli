import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Enables or disables a channel. */
export const channelUpdateStatus = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'update-status',
  capabilityId: 'engage-setting.channel.update-status',
  description: 'Enable or disable a channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID.' },
    { name: 'status', type: 'number', required: true, desc: 'Channel status: 1 enabled, 2 disabled.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
    status: ctx.num('status'),
  }),
});
