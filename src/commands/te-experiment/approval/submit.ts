import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
  };
}

/** Submit a saved experiment draft for approval. */
export const approvalSubmit = createExperimentCapabilityCommand({
  resource: 'approval', command: 'submit', capabilityId: 'experiment.approval.submit',
  description: 'Submit a saved experiment draft for approval.',
  helpText: 'Submission creates a pending review; it does not approve or start the experiment.\nRead approval get after submission to inspect the exact proposal and approval ID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
