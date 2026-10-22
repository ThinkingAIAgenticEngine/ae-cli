import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-run-schedules';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    run_id: ctx.str('run-id'),
    frequency: ctx.str('frequency'),
    time_zone: ctx.str('time-zone'),
  };
  const minuteOfHour = ctx.optionalNum('minute-of-hour');
  if (minuteOfHour !== undefined) body.minute_of_hour = minuteOfHour;
  const hourOfDay = ctx.optionalNum('hour-of-day');
  if (hourOfDay !== undefined) body.hour_of_day = hourOfDay;
  const dayOfWeek = ctx.optionalNum('day-of-week');
  if (dayOfWeek !== undefined) body.day_of_week = dayOfWeek;
  const dayOfMonth = ctx.optionalNum('day-of-month');
  if (dayOfMonth !== undefined) body.day_of_month = dayOfMonth;
  return body;
}

export const createSchedule: Command = {
  service: 'evaluation',
  command: '+create_schedule',
  description:
    'Create a recurring evaluation schedule from an existing run template via POST /agenteval/api/v1/evaluation-run-schedules. Each occurrence creates and starts a new immutable run.',
  flags: [
    ...evalFlags(),
    { name: 'run-id', type: 'string', required: true, desc: 'Template run UUID to schedule' },
    {
      name: 'frequency',
      type: 'string',
      required: true,
      desc: 'HOURLY | DAILY | WEEKLY | MONTHLY. HOURLY runs at minute 0 and must omit minute fields',
    },
    {
      name: 'time-zone',
      type: 'string',
      required: true,
      desc: 'IANA time zone, e.g. Asia/Shanghai',
    },
    {
      name: 'minute-of-hour',
      type: 'number',
      min: 0,
      max: 59,
      desc: 'Minute of the hour. Required for DAILY/WEEKLY/MONTHLY (send 0 for hourly)',
    },
    { name: 'hour-of-day', type: 'number', min: 0, max: 23, desc: 'Hour of the day (0-23)' },
    {
      name: 'day-of-week',
      type: 'number',
      min: 1,
      max: 7,
      desc: 'Day of the week for WEEKLY: Monday is 1, Sunday is 7',
    },
    { name: 'day-of-month', type: 'number', min: 1, max: 31, desc: 'Day of the month for MONTHLY (1-31)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
