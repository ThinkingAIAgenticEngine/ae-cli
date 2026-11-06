import type { RuntimeContext } from '../../../framework/types.js';
import { addOptionalString, createExperimentCapabilityCommand } from '../capability-shared.js';

const targetStatuses = ['draft', 'testing', 'pending', 'running', 'paused', 'ended', 'archive'];

/** Builds the experiment status input. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {
    project_id: ctx.num('project-id'),
    exp_id: ctx.str('exp-id'),
    target_status: ctx.str('target-status'),
  };
  addOptionalString(input, 'remark', ctx.str('remark'));
  return input;
}

/** Updates an experiment status. */
export const experimentManage = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'manage', capabilityId: 'experiment.experiment.manage',
  description: 'Update an experiment status.',
  helpText: 'On approval-enabled servers, draft to pending submits the saved draft for approval.\n'
    + 'The pending submission path also works on older servers. Use approval get only when supported.\n'
    + 'Submit once; success does not mean running. Verify runtime status with experiment get.\n'
    + 'Using --target-status running on an eligible experiment starts immediately. Read detail first: when\n'
    + 'start_time_adjustment_required is true, an early start uses the current server time.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
    { name: 'target-status', type: 'string', required: true, desc: 'Target experiment status.' },
    { name: 'remark', type: 'string', required: false, desc: 'Operation remark.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const value = ctx.str('target-status');
    if (!targetStatuses.includes(value)) {
      throw new Error(`Flag --target-status must be one of: ${targetStatuses.join(', ')}`);
    }
  },
  buildInput,
});
