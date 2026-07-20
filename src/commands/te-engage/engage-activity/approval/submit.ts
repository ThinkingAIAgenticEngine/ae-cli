import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Submits an activity for approval. */
export const approvalSubmit = createEngageActivityCapabilityCommand({
  resource: 'approval',
  command: 'submit',
  capabilityId: 'engage-activity.approval.submit',
  description: 'Submit an activity for approval.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional submit note.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
    reason: ctx.str('reason') || undefined,
  }),
});
