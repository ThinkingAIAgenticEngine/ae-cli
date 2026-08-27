import { createProjectSemanticCommand } from '../shared.js';

export const projectSemanticCandidateGet = createProjectSemanticCommand({
  resource: 'candidate',
  command: 'get',
  capabilityId: 'business_semantics.candidate.get',
  description: 'Get one project semantic candidate with evidence and structured asset bindings.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'candidate-id', type: 'string', required: true, desc: 'Exact candidate ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    candidate_id: ctx.str('candidate-id'),
  }),
});
