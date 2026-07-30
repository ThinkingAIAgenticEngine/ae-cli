import { createEngageTaskCapabilityCommand } from '../../shared.js';
import type { RuntimeContext } from '../../../../framework/types.js';

/** Builds the mutually exclusive existing-task or legacy approval input. */
function buildSubmitApprovalInput(ctx: RuntimeContext): Record<string, unknown> {
  const taskId = ctx.str('task-id').trim();
  const request = ctx.json('request');
  if ((taskId === '') === (request === undefined)) {
    throw new Error('Exactly one of --task-id or --request is required');
  }
  if (request !== undefined && (request === null || typeof request !== 'object' || Array.isArray(request))) {
    throw new Error('Flag --request must be a JSON object');
  }
  return {
    project_id: ctx.num('project-id'),
    ...(taskId !== '' && { task_id: taskId }),
    ...(request !== undefined && { request }),
  };
}

/** Saves a draft task and submits it for approval. */
export const taskSubmitApproval = createEngageTaskCapabilityCommand({
  resource: 'task',
  command: 'submit-approval',
  capabilityId: 'engage-task.task.submit-approval',
  description: 'Save a draft task and submit it for approval.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'task-id',
      type: 'string',
      required: false,
      desc: 'Existing draft task ID. Exactly one of --task-id or --request is required.',
    },
    {
      name: 'request',
      type: 'json',
      required: false,
      desc: 'Legacy ApprovalSaveAndSubmitDTO JSON. Exactly one of --task-id or --request is required.',
    },
  ],
  risk: 'write',
  validate: (ctx) => { buildSubmitApprovalInput(ctx); },
  buildInput: buildSubmitApprovalInput,
});
