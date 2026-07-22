import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists config channels of a project. */
export const configChannelList = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'list',
  capabilityId: 'engage-scene.config-channel.list',
  description: 'List config channels of a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'channel-type',
      type: 'number',
      required: false,
      desc: 'Optional channel type filter: 0 webhook, 1 client.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => {
    const input: Record<string, unknown> = {
      project_id: ctx.num('project-id'),
    };
    const channelType = ctx.optionalNum('channel-type');
    if (channelType !== undefined) {
      input.channel_type = channelType;
    }
    return input;
  },
});
