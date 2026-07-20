import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Approves an activity. */
export const approvalApprove = createEngageActivityCapabilityCommand({
  resource: 'approval',
  command: 'approve',
  capabilityId: 'engage-activity.approval.approve',
  description: 'Approve an activity.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional approval note.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
    reason: ctx.str('reason') || undefined,
  }),
});
