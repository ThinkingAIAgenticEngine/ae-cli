import {
  addOptionalBoolean,
  addOptionalString,
  createExperimentCapabilityCommand,
} from '../capability-shared.js';

/** Queries an experiment sample-size report. */
export const reportSampleSize = createExperimentCapabilityCommand({
  resource: 'report',
  command: 'sample-size',
  capabilityId: 'experiment.report.sample-size',
  description: 'Query an experiment sample-size report for a date range.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date in yyyy-MM-dd format.' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date in yyyy-MM-dd format.' },
    {
      name: 'request-id',
      type: 'string',
      required: false,
      desc: 'Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted.',
    },
    { name: 'force-refresh', type: 'boolean', required: false, desc: 'Force refresh report data.' },
    { name: 'by-hour', type: 'boolean', required: false, desc: 'Break results down by hour.' },
  ],
  risk: 'read',
  buildInput: (ctx) => {
    const input: Record<string, unknown> = {
      project_id: ctx.num('project-id'),
      exp_id: ctx.str('exp-id'),
      start_time: ctx.str('start-time'),
      end_time: ctx.str('end-time'),
    };
    addOptionalString(input, 'request_id', ctx.str('request-id'));
    addOptionalBoolean(input, ctx, 'force-refresh', 'force_refresh');
    addOptionalBoolean(input, ctx, 'by-hour', 'by_hour');
    return input;
  },
});
