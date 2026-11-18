import type { RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { createExperimentCapabilityCommand, readPositiveInteger } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const value = ctx.json('approvers');
  if (!Array.isArray(value) || value.length < 1 || value.length > 10
      || !value.every((item) => typeof item === 'string' && item.trim() !== '')) {
    throw new CliValidationError('Flag --approvers must contain 1 to 10 non-empty open IDs');
  }
  return {
    project_id: readPositiveInteger(ctx, 'project-id'),
    approvers: value.map((item: string) => item.trim()),
  };
}

/** Add eligible project experiment approvers. */
export const approverAdd = createExperimentCapabilityCommand({
  resource: 'approver', command: 'add', capabilityId: 'experiment.approver.add',
  description: 'Add eligible project experiment approvers.',
  helpText: 'Adds 1 to 10 verified project member open IDs.\n'
    + 'Requires engage:write and experiment settings edit permission (experimentEditSetting).\n'
    + 'Experiment approvers are independent of Engage task approvers.\n'
    + 'On updated servers, a non-empty roster enables Feature experiment approval for subsequent submissions and delivery changes.\n'
    + 'External experiments are exempt; existing effective configurations do not require retrospective approval.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Positive integer project ID.' },
    { name: 'approvers', type: 'json', required: true, desc: 'JSON array of 1 to 10 eligible project member open IDs.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
