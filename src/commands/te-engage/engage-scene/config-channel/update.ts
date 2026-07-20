import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config channel's name and optionally its config. */
export const configChannelUpdate = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'update',
  capabilityId: 'engage-scene.config-channel.update',
  description: 'Update a config channel\'s name and optionally its config.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID to update.' },
    { name: 'channel-name', type: 'string', required: true, desc: 'New channel name.' },
    {
      name: 'config',
      type: 'string',
      required: false,
      desc: 'Channel-specific JSON config string. Omit to keep the current config (typical when renaming an enabled channel).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
    channel_name: ctx.str('channel-name'),
    config: ctx.str('config') || undefined,
  }),
});
