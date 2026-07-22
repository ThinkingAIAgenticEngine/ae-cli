import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries approvers in a project. */
export const approvalApproverList = createEngageSettingCapabilityCommand({
  resource: 'approval-approver',
  command: 'list',
  capabilityId: 'engage-setting.approval-approver.list',
  description: 'Query approvers in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
