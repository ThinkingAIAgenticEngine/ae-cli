import { createPersonalSemanticPreferenceCommand } from './shared.js';

export const personalSemanticPreferenceGet = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'get',
  capabilityId: 'business_semantics.personal_context.get',
  description: 'Get one personal semantic preference; use --mark-used only after adopting it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Positive project ID, or -1 for current-user global personal semantics.', alias: 'p' },
    { name: 'id', type: 'string', required: true, desc: 'Preference ID returned by list/add.' },
    { name: 'title', type: 'string', required: true, desc: 'Preference title copied from list output for telemetry only.', minLength: 1, maxLength: 255 },
    { name: 'include-expired', type: 'boolean', desc: 'Maintenance read of expired entries; cannot be combined with --mark-used.' },
    { name: 'mark-used', type: 'boolean', desc: 'Count this preference as adopted and update its usage heat.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    title: ctx.str('title'),
    mark_used: ctx.bool('mark-used'),
    ...(ctx.bool('include-expired') ? { include_expired: true } : {}),
  }),
});
