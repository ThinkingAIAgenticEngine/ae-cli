import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
  };
}

/** Submit a saved experiment draft using the server approval policy. */
export const approvalSubmit = createExperimentCapabilityCommand({
  resource: 'approval', command: 'submit', capabilityId: 'experiment.approval.submit',
  description: 'Submit a saved experiment draft using the server approval policy.',
  helpText: 'On updated servers, only Feature experiments with configured approvers enter review.\n'
    + 'External experiments and Feature experiments with an empty roster submit directly.\n'
    + 'An exempt Feature submission stays pending for its existing manual or scheduled start.\n'
    + 'Existing pending reviews must be withdrawn before resubmission.\n'
    + 'Read experiment get for actual status and approval get for any review; older servers may use a different policy.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
