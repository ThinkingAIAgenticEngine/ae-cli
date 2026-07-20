import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectInfoUpdate = createAnalysisCapabilityCommand({
  resource: 'project info',
  command: 'update',
  capabilityId: 'project.info.update',
  description: 'Update project name and remark.',
  flags: [
    projectIdFlag,
    { name: 'project-name', type: 'string', required: true, desc: 'New project name.' },
    { name: 'project-remark', type: 'string', required: false, desc: 'Optional project remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    project_name: ctx.str('project-name'),
    project_remark: optionalString(ctx, 'project-remark'),
  }),
});
