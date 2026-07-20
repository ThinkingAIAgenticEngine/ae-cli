import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Queries a config channel's operation log. */
export const configChannelQueryLog = createEngageSceneCapabilityCommand({
  resource: 'config-channel',
  command: 'query-log',
  capabilityId: 'engage-scene.config-channel.query-log',
  description: 'Query a config channel\'s operation log.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID whose operation log to query.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
  }),
});
