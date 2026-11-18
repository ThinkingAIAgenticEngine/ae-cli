import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
    approval_id: readPositiveInteger(ctx, 'approval-id'),
  };
}

/** Approve the exact pending experiment configuration. */
export const approvalApprove = createExperimentCapabilityCommand({
  resource: 'approval', command: 'approve', capabilityId: 'experiment.approval.approve',
  description: 'Approve the exact pending experiment configuration.',
  helpText: 'Read approval get and review its configuration and can_approve before approving.\nApproval can start a due Feature experiment and synchronize RCC.\nPass the reviewed approval ID; stale approvals must be read and reviewed again.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
    { name: 'approval-id', type: 'number', required: true, desc: 'Exact positive integer approval ID from approval get; never guess or reuse a stale ID.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
