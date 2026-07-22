import { createEngageSettingCapabilityCommand } from '../../shared.js';
import { readRequiredJsonArray } from '../../utils.js';

/** Adds approvers to a project. */
export const approvalApproverAdd = createEngageSettingCapabilityCommand({
  resource: 'approval-approver',
  command: 'add',
  capabilityId: 'engage-setting.approval-approver.add',
  description: 'Add up to 10 approvers to a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'approvers', type: 'json', required: true, desc: 'Approver open ID JSON array; maximum 10.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredJsonArray(ctx, 'approvers'); },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    approvers: readRequiredJsonArray(ctx, 'approvers'),
  }),
});
