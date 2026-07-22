import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Enables or disables a config channel. */
export const configChannelUpdateStatus = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'update-status',
  capabilityId: 'engage-scene.config-channel.update-status',
  description: 'Enable or disable a config channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID.' },
    {
      name: 'channel-status',
      type: 'number',
      required: true,
      desc: 'Channel status: 1 enable, 2 disable.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
    channel_status: ctx.num('channel-status'),
  }),
});
