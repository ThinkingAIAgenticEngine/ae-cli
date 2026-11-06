import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand, readPositiveInteger } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
  };
}

/** List project experiment approvers and their eligibility. */
export const approverList = createExperimentCapabilityCommand({
  resource: 'approver', command: 'list', capabilityId: 'experiment.approver.list',
  description: 'List project experiment approvers and their eligibility.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
  ],
  risk: 'read',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
