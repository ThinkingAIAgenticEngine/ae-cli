import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Lists available activity types (system + custom). */
export const activityTypeList = createEngageActivityCapabilityCommand({
  resource: 'activity-type',
  command: 'list',
  capabilityId: 'engage-activity.activity-type.list',
  description: 'List available activity types (system + custom).',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
