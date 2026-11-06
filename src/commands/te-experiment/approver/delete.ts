import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    approver: readNonEmptyString(ctx, 'approver'),
  };
}

/** Remove one project experiment approver. */
export const approverDelete = createExperimentCapabilityCommand({
  resource: 'approver', command: 'delete', capabilityId: 'experiment.approver.delete',
  description: 'Remove one project experiment approver.',
  helpText: 'Requires experiment management permission. Removing a member preserves approval history.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'approver', type: 'string', required: true, desc: 'Existing experiment approver open ID to remove.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
