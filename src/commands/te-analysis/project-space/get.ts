import {
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  optionalJson,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceGet = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'get',
  capabilityId: 'analysis.project_space.get',
  description: 'Get one project space detail.',
  flags: [projectIdFlag, { name: 'space-id', type: 'number', required: true, desc: 'Project space ID.' }, fieldsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    space_id: ctx.num('space-id'),
    fields: optionalJson(ctx, 'fields'),
  }),
});
