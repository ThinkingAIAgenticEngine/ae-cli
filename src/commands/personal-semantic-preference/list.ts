import { createPersonalSemanticPreferenceCommand } from './shared.js';

const CAPABILITY_ID = 'business_semantics.personal_context.list';

export const personalSemanticPreferenceList = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'list',
  capabilityId: CAPABILITY_ID,
  description: 'List the complete current-user lightweight personal semantic preference catalog for the selected scope.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Positive project ID, or -1 for current-user global personal semantics.', alias: 'p' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
