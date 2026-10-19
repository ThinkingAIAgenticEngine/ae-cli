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
