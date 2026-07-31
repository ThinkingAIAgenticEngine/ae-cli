import {
  addOptionalBoolean,
  addOptionalString,
  createExperimentCapabilityCommand,
} from '../capability-shared.js';

/** Queries an experiment metric trend report. */
export const reportMetricTrend = createExperimentCapabilityCommand({
  resource: 'report',
  command: 'metric-trend',
  capabilityId: 'experiment.report.metric-trend',
  description: 'Query an experiment metric trend report for a date range.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
    { name: 'metric-id', type: 'string', required: true, desc: 'Metric ID.' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date in yyyy-MM-dd format.' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date in yyyy-MM-dd format.' },
    {
      name: 'request-id',
      type: 'string',
      required: false,
      desc: 'Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted.',
    },
    { name: 'force-refresh', type: 'boolean', required: false, desc: 'Force refresh report data.' },
  ],
  risk: 'read',
  buildInput: (ctx) => {
    const input: Record<string, unknown> = {
      project_id: ctx.num('project-id'),
      exp_id: ctx.str('exp-id'),
      metric_id: ctx.str('metric-id'),
      start_time: ctx.str('start-time'),
      end_time: ctx.str('end-time'),
    };
    addOptionalString(input, 'request_id', ctx.str('request-id'));
    addOptionalBoolean(input, ctx, 'force-refresh', 'force_refresh');
    return input;
  },
});
