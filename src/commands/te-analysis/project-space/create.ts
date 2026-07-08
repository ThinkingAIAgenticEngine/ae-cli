import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceCreate = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'create',
  capabilityId: 'analysis.project_space.create',
  description: 'Create a project space.',
  flags: [
    projectIdFlag,
    { name: 'space-name', type: 'string', required: false, desc: 'Project space name.' },
    { name: 'space-desc', type: 'string', required: false, desc: 'Project space description.' },
    { name: 'avatar-type', type: 'number', required: false, desc: 'Avatar type.' },
    { name: 'color-key', type: 'string', required: false, desc: 'Avatar color key.' },
    { name: 'avatar', type: 'string', required: false, desc: 'Avatar value.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    space_name: optionalString(ctx, 'space-name'),
    space_desc: optionalString(ctx, 'space-desc'),
    avatar_type: optionalNumber(ctx, 'avatar-type'),
    color_key: optionalString(ctx, 'color-key'),
    avatar: optionalString(ctx, 'avatar'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
