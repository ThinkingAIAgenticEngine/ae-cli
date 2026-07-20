import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectReceiveStatusUpdate = createAnalysisCapabilityCommand({
  resource: 'project receive-status',
  command: 'update',
  capabilityId: 'project.receive_status.update',
  description: 'Update project data receive status.',
  flags: [
    projectIdFlag,
    { name: 'receive-status', type: 'string', required: true, desc: 'Receive status: NORMAL or STOP_RECEIVE.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    receive_status: ctx.str('receive-status'),
    yes: true,
  }),
});
