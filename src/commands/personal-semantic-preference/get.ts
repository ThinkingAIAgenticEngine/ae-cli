import { createPersonalSemanticPreferenceCommand } from './shared.js';

export const personalSemanticPreferenceGet = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'get',
  capabilityId: 'business_semantics.personal_context.get',
  description: 'Get one personal semantic preference; use --mark-used only after adopting it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'id', type: 'string', required: true, desc: 'Preference ID returned by list/add.' },
    { name: 'mark-used', type: 'boolean', desc: 'Count this preference as adopted and update its usage heat.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    mark_used: ctx.bool('mark-used'),
  }),
});
