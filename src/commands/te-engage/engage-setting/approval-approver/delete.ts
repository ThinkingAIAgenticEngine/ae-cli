import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Removes an approver (by open_id) from a project's operation-approval approver list. */
export const approvalApproverDelete = createEngageSettingCapabilityCommand({
  resource: 'approval-approver',
  command: 'delete',
  capabilityId: 'engage-setting.approval-approver.delete',
  description: 'Remove an approver (by open_id) from a project\'s operation-approval approver list.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'approver', type: 'string', required: true, desc: 'OpenID of the approver to remove.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    approver: ctx.str('approver'),
  }),
});
