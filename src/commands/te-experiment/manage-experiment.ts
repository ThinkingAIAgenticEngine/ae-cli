import type { RuntimeContext } from '../../framework/types.js';
import { addOptionalString, createExperimentCommand, PROJECT_ID_FLAG, requireAllowedValue } from './shared.js';

const TARGET_STATUSES = ['draft', 'testing', 'pending', 'running', 'paused', 'ended', 'archive'];

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    expId: ctx.str('exp_id'),
    targetStatus: ctx.str('target_status'),
  };
  addOptionalString(args, ctx, 'remark', 'remark');
  return args;
}

export const manageExperiment = createExperimentCommand({
  command: '+manage_experiment',
  description: 'Manage experiment status.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_id', type: 'string', required: true, desc: 'Experiment ID' },
    { name: 'target_status', type: 'string', required: true, desc: 'Target status: draft, testing, pending, running, paused, ended, or archive' },
    { name: 'remark', type: 'string', required: false, desc: 'Operation remark' },
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    requireAllowedValue(ctx.str('target_status'), TARGET_STATUSES, 'target_status');
  },
  buildArgs,
});
