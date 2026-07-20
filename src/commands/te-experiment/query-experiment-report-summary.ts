import type { RuntimeContext } from '../../framework/types.js';
import { addOptionalBoolean, createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    expId: ctx.str('exp_id'),
  };
  addOptionalBoolean(args, ctx, 'force_refresh', 'forceRefresh');
  return args;
}

export const queryExperimentReportSummary = createExperimentCommand({
  command: '+query_experiment_report_summary',
  description: 'Query an experiment report summary.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_id', type: 'string', required: true, desc: 'Experiment ID' },
    { name: 'force_refresh', type: 'boolean', required: false, desc: 'Whether to force refresh report data' },
  ],
  risk: 'read',
  buildArgs,
});
