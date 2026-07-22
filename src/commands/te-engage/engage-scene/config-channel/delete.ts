import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Deletes a disabled config channel. */
export const configChannelDelete = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'delete',
  capabilityId: 'engage-scene.config-channel.delete',
  description: 'Delete a disabled config channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'channel-id',
      type: 'string',
      required: true,
      desc: 'Channel ID to delete. Channel must be disabled first.',
    },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
  }),
});
