import { createProjectSemanticCommand } from '../shared.js';

export const projectSemanticReleaseList = createProjectSemanticCommand({
  resource: 'release',
  command: 'list',
  capabilityId: 'business_semantics.release.list',
  description: 'List project semantic releases and the current release version.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
