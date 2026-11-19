import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
    approval_id: readPositiveInteger(ctx, 'approval-id'),
  };
}

/** Withdraw the exact pending experiment configuration. */
export const approvalWithdraw = createExperimentCapabilityCommand({
  resource: 'approval', command: 'withdraw', capabilityId: 'experiment.approval.withdraw',
  description: 'Withdraw the exact pending experiment configuration.',
  helpText: 'Read approval get and check can_cancel before withdrawing the exact approval ID.\nWithdrawal preserves the current effective configuration and runtime status.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
    { name: 'approval-id', type: 'number', required: true, desc: 'Exact positive integer approval ID from approval get; never guess or reuse a stale ID.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
