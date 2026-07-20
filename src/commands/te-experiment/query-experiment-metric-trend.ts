import type { RuntimeContext } from '../../framework/types.js';
import { addOptionalBoolean, addOptionalString, createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    expId: ctx.str('exp_id'),
    metricId: ctx.str('metric_id'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  addOptionalString(args, ctx, 'request_id', 'requestId');
  addOptionalBoolean(args, ctx, 'force_refresh', 'forceRefresh');
  return args;
}

export const queryExperimentMetricTrend = createExperimentCommand({
  command: '+query_experiment_metric_trend',
  description: 'Query an experiment metric trend report.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_id', type: 'string', required: true, desc: 'Experiment ID' },
    { name: 'metric_id', type: 'string', required: true, desc: 'Metric ID' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date, yyyy-MM-dd' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date, yyyy-MM-dd' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID for query tracking' },
    { name: 'force_refresh', type: 'boolean', required: false, desc: 'Whether to force refresh report data' },
  ],
  risk: 'read',
  buildArgs,
});
