import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceMembers = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'members',
  capabilityId: 'analysis.project_space.members',
  description: 'Get project space members.',
  flags: [projectIdFlag, { name: 'space-id', type: 'number', required: true, desc: 'Project space ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    space_id: ctx.num('space-id'),
  }),
});
