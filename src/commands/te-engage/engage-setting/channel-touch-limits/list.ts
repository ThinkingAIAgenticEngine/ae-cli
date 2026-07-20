import { createEngageSettingCapabilityCommand } from '../../shared.js';

export const channelTouchLimitsList = createEngageSettingCapabilityCommand({
  resource: 'channel-touch-limits',
  command: 'list',
  capabilityId: 'engage-setting.channel-touch-limits.list',
  description: 'List all channel touch-limit (fatigue-control) rules for a project, with each rule\'s enable state, definition, and bound channels.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
