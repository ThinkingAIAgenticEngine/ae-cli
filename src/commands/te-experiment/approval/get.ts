import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger, readNonEmptyString } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    exp_id: readNonEmptyString(ctx, 'exp-id'),
  };
}

/** Read the latest experiment approval and proposed configuration. */
export const approvalGet = createExperimentCapabilityCommand({
  resource: 'approval', command: 'get', capabilityId: 'experiment.approval.get',
  description: 'Read the latest experiment approval and proposed configuration.',
  helpText: 'Returns item=null when the experiment has no approval history.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Existing experiment ID.' },
  ],
  risk: 'read',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
