import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Rejects an activity with a reason. */
export const approvalReject = createEngageActivityCapabilityCommand({
  resource: 'approval',
  command: 'reject',
  capabilityId: 'engage-activity.approval.reject',
  description: 'Reject an activity with a reason.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID.' },
    { name: 'reason', type: 'string', required: true, desc: 'Reject reason (required, max 72 characters).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
    reason: ctx.str('reason') || undefined,
  }),
});
