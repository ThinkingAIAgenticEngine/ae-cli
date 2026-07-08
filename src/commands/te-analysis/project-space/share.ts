import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceShare = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'share',
  capabilityId: 'analysis.project_space.share',
  description: 'Modify project space sharing members.',
  flags: [projectIdFlag, { name: 'space-id', type: 'number', required: true, desc: 'Project space ID.' }, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    space_id: ctx.num('space-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
