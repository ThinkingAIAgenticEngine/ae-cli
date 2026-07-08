import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJsonArray,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceDelete = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'delete',
  capabilityId: 'analysis.project_space.delete',
  description: 'Delete one or more project spaces.',
  flags: [
    projectIdFlag,
    { name: 'space-id', type: 'number', required: false, desc: 'Project space ID.' },
    { name: 'space-ids', type: 'json', required: false, desc: 'Project space ID array.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    space_id: optionalNumber(ctx, 'space-id'),
    space_ids: optionalJsonArray(ctx, 'space-ids'),
  }),
});
