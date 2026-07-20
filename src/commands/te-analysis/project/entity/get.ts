import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectEntityGet = createAnalysisCapabilityCommand({
  resource: 'project entity',
  command: 'get',
  capabilityId: 'project.entity.get',
  description: 'Get one analysis entity.',
  flags: [
    projectIdFlag,
    { name: 'entity-id', type: 'number', required: true, desc: 'Analysis entity ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    entity_id: ctx.num('entity-id'),
  }),
});
