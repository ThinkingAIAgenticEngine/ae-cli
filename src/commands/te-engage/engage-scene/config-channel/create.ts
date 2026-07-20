import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Creates a config channel and enables it. */
export const configChannelCreate = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'create',
  capabilityId: 'engage-scene.config-channel.create',
  description: 'Create a config channel and enable it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-name', type: 'string', required: true, desc: 'Channel name.' },
    { name: 'channel-type', type: 'number', required: true, desc: 'Channel type: 0 webhook, 1 client.' },
    { name: 'config', type: 'string', required: true, desc: 'Channel-specific JSON config string.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_name: ctx.str('channel-name'),
    channel_type: ctx.num('channel-type'),
    config: ctx.str('config'),
  }),
});
