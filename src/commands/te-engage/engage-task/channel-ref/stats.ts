import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Queries engagement-task reference counts for a channel. */
export const channelRefStats = createEngageTaskCapabilityCommand({
  resource: 'channel-ref',
  command: 'stats',
  capabilityId: 'engage-task.channel-ref.stats',
  description: 'Query engagement-task reference counts for a channel.',
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
