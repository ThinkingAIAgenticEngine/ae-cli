import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluation-run-schedules';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    frequency: ctx.str('frequency'),
    time_zone: ctx.str('time-zone'),
    lock_version: ctx.num('lock-version'),
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

export const updateSchedule: Command = {
  service: 'evaluation',
  command: '+update_schedule',
  description:
    'Update a run schedule via PATCH /agenteval/api/v1/evaluation-run-schedules/{id}: change frequency, time zone, or occurrence time. Requires the current schedule lock_version from +list_schedules.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Schedule UUID', 'schedule'),
    {
      name: 'frequency',
      type: 'string',
      required: true,
      desc: 'HOURLY | DAILY | WEEKLY | MONTHLY. HOURLY runs at minute 0 and must omit minute fields',
    },
    { name: 'time-zone', type: 'string', required: true, desc: 'IANA time zone, e.g. Asia/Shanghai' },
    { name: 'minute-of-hour', type: 'number', min: 0, max: 59, desc: 'Minute of the hour. Required for DAILY/WEEKLY/MONTHLY' },
    { name: 'hour-of-day', type: 'number', min: 0, max: 23, desc: 'Hour of the day (0-23)' },
    { name: 'day-of-week', type: 'number', min: 1, max: 7, desc: 'Day of the week for WEEKLY: Monday is 1, Sunday is 7' },
    { name: 'day-of-month', type: 'number', min: 1, max: 31, desc: 'Day of the month for MONTHLY (1-31)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
