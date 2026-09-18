import { createProjectSemanticCommand } from './shared.js';

export const projectSemanticGet = createProjectSemanticCommand({
  resource: '',
  command: 'get',
  capabilityId: 'business_semantics.entry.get',
  description: 'Get one enabled project semantic; use --mark-used only after adopting it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'id', type: 'string', required: true, desc: 'Semantic ID returned by project-semantic list.' },
    { name: 'mark-used', type: 'boolean', desc: 'Count this project semantic as used by CLI or Agent.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    mark_used: ctx.bool('mark-used'),
  }),
});
