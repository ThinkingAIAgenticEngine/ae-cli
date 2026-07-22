import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets a config channel's detail. */
export const configChannelGet = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'get',
  capabilityId: 'engage-scene.config-channel.get',
  description: 'Get a config channel\'s detail including config JSON.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
  }),
});
