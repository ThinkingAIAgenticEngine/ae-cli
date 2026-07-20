import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectTimezoneUpdate = createAnalysisCapabilityCommand({
  resource: 'project timezone',
  command: 'update',
  capabilityId: 'project.timezone.update',
  description: 'Update one project time zone configuration item.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    { name: 'item', type: 'string', required: true, desc: 'Timezone item: timezone_toggle, zone_offset, user_timezone, project_timezone_display.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
    item: ctx.str('item'),
  }),
});
