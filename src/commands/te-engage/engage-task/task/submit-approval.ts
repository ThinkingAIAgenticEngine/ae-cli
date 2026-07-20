import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Saves a draft task and submits it for approval. */
export const taskSubmitApproval = createEngageTaskCapabilityCommand({
  resource: 'task',
  command: 'submit-approval',
  capabilityId: 'engage-task.task.submit-approval',
  description: 'Save a draft task and submit it for approval.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'request',
      type: 'json',
      required: true,
      desc: 'ApprovalSaveAndSubmitDTO payload as JSON.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    request: ctx.json('request'),
  }),
});
