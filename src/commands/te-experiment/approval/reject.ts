import type { RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const reason = readNonEmptyString(ctx, 'reason');
  if (reason.length > 72) throw new CliValidationError('Flag --reason must not exceed 72 characters');
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
    approval_id: readPositiveInteger(ctx, 'approval-id'),
    reason,
  };
}

/** Reject the exact pending experiment configuration. */
export const approvalReject = createExperimentCapabilityCommand({
  resource: 'approval', command: 'reject', capabilityId: 'experiment.approval.reject',
  description: 'Reject the exact pending experiment configuration.',
  helpText: 'Read approval get before rejecting. The reason is required and limited to 72 characters.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
    { name: 'approval-id', type: 'number', required: true, desc: 'Exact positive integer approval ID from approval get; never guess or reuse a stale ID.' },
    { name: 'reason', type: 'string', required: true, desc: 'Rejection reason; 1 to 72 characters after trimming.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
