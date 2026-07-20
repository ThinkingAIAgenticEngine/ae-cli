import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Cancels/withdraws a submitted activity approval. */
export const approvalCancel = createEngageActivityCapabilityCommand({
  resource: 'approval',
  command: 'cancel',
  capabilityId: 'engage-activity.approval.cancel',
  description: 'Cancel/withdraw a submitted activity approval.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional cancel note.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
    reason: ctx.str('reason') || undefined,
  }),
});
