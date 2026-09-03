import type { Command, Flag, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  hasValue,
  optionalBoolean,
  validateDateRange,
  validateEnum,
  validateIsoDate,
  validatePositiveSafeInteger,
} from './backfill-options.js';

const toolName = 'operations_create_backfill_job';
const JOB_TYPES = ['TASK_ALL', 'TASK_ONLY', 'TASK_PRE', 'TASK_POST'] as const;
const FAILURE_STRATEGIES = ['END', 'CONTINUE'] as const;
const INTERVAL_UNITS = ['DAY', 'WEEK', 'MONTH'] as const;
const ST_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export function buildBackfillDraftArgs(ctx: RuntimeContext): Record<string, unknown> {
  const customDates = hasValue(ctx, 'completeDates');
  return {
    spaceCode: ctx.str('spaceCode'),
    jobName: ctx.str('jobName'),
    flowCode: ctx.num('flowCode'),
    jobType: ctx.str('jobType') || 'TASK_ALL',
    startNode: ctx.optionalNum('startNode'),
    failureStrategy: ctx.str('failureStrategy') || 'END',
    parallel: optionalBoolean(ctx, 'parallel', true),
    completeDates: customDates ? ctx.json('completeDates') : undefined,
    startDate: ctx.str('startDate'),
    endDate: ctx.str('endDate'),
    step: customDates ? undefined : (ctx.optionalNum('step') ?? 1),
    unit: customDates ? undefined : (ctx.str('unit') || 'DAY'),
    reverse: optionalBoolean(ctx, 'reverse', false),
    stTime: ctx.str('stTime'),
  };
}

export function validateBackfillDraft(ctx: RuntimeContext): void {
  validatePositiveSafeInteger(ctx, 'flowCode');
  if (ctx.str('jobName').trim() === '') {
    throw new CliValidationError('--jobName must be non-empty', {
      location: { field: 'jobName' },
    });
  }

  validateEnum(ctx, 'jobType', JOB_TYPES);
  validateEnum(ctx, 'failureStrategy', FAILURE_STRATEGIES);
  const jobType = ctx.str('jobType') || 'TASK_ALL';
  const hasStartNode = hasValue(ctx, 'startNode');
  if (jobType !== 'TASK_ALL' && !hasStartNode) {
    throw new CliValidationError('--startNode is required when --jobType is not TASK_ALL', {
      location: { field: 'startNode' },
    });
  }
  if (hasStartNode) validatePositiveSafeInteger(ctx, 'startNode');

  const stTime = ctx.str('stTime');
  if (stTime !== '' && !ST_TIME_PATTERN.test(stTime)) {
    throw new CliValidationError('--stTime must use HH:mm:ss in 24-hour time', {
      location: { field: 'stTime' },
    });
  }

  const hasCustomDates = hasValue(ctx, 'completeDates');
  const hasStartDate = hasValue(ctx, 'startDate');
  const hasEndDate = hasValue(ctx, 'endDate');
  if (!hasStartDate || !hasEndDate) {
    throw new CliValidationError('Pass both --startDate and --endDate');
  }
  const startDate = ctx.str('startDate');
  const endDate = ctx.str('endDate');
  validateDateRange(startDate, endDate);

  if (hasCustomDates) {
    const dates = validateCompleteDates(ctx.json('completeDates'));
    if (dates.some((date) => date < startDate || date > endDate)) {
      throw new CliValidationError('--completeDates values must be inside --startDate and --endDate', {
        location: { field: 'completeDates' },
      });
    }
    return;
  }

  const step = ctx.optionalNum('step') ?? 1;
  if (!Number.isInteger(step) || step < 1) {
    throw new CliValidationError('--step must be a positive integer', {
      location: { field: 'step' },
    });
  }
  validateEnumValue(ctx.str('unit') || 'DAY', 'unit', INTERVAL_UNITS);
}

function validateCompleteDates(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CliValidationError('--completeDates must be a non-empty JSON array of yyyy-MM-dd strings', {
      location: { field: 'completeDates' },
    });
  }
  const dates = value as unknown[];
  if (!dates.every((date) => typeof date === 'string')) {
    throw new CliValidationError('--completeDates must contain only yyyy-MM-dd strings', {
      location: { field: 'completeDates' },
    });
  }
  for (const date of dates as string[]) validateIsoDate(date, 'completeDates');
  if (new Set(dates).size !== dates.length) {
    throw new CliValidationError('--completeDates must not contain duplicate dates', {
      location: { field: 'completeDates' },
    });
  }
  return dates as string[];
}

function validateEnumValue(value: string, name: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new CliValidationError(`--${name} must be DAY, WEEK, or MONTH`, {
      location: { field: name },
    });
  }
}

export const createBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+create_backfill_job',
  description: 'Create a DRAFT backfill job for one PROD task flow. Always pass a date range; completeDates optionally selects dates inside it. Creation never starts the job.',
  flags: backfillDraftFlags(),
  risk: 'write',
  validate: validateBackfillDraft,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillDraftArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillDraftArgs(ctx)),
};

export function backfillDraftFlags(): Flag[] {
  return [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'jobName', type: 'string', required: true, maxLength: 50, desc: 'Backfill job name, up to 50 characters' },
    { name: 'flowCode', type: 'number', required: true, desc: 'PROD task flow code from +list_backfill_flows' },
    { name: 'jobType', type: 'string', required: false, default: 'TASK_ALL', desc: 'Backfill scope: TASK_ALL, TASK_ONLY, TASK_PRE, or TASK_POST. Default TASK_ALL' },
    { name: 'startNode', type: 'number', required: false, desc: 'Start task code. Required when jobType is not TASK_ALL' },
    { name: 'failureStrategy', type: 'string', required: false, default: 'END', desc: 'Failure strategy: END or CONTINUE. Default END' },
    { name: 'parallel', type: 'boolean', required: false, default: true, desc: 'Whether plans may run in parallel. Default true' },
    { name: 'completeDates', type: 'json', required: false, desc: 'Optional non-empty JSON array of unique base dates inside the configured range' },
    { name: 'startDate', type: 'string', required: true, desc: 'Range start date in yyyy-MM-dd format' },
    { name: 'endDate', type: 'string', required: true, desc: 'Range end date in yyyy-MM-dd format' },
    { name: 'step', type: 'number', required: false, default: 1, min: 1, desc: 'Positive interval step for range mode. Default 1' },
    { name: 'unit', type: 'string', required: false, default: 'DAY', desc: 'Range interval unit: DAY, WEEK, or MONTH. Default DAY' },
    { name: 'reverse', type: 'boolean', required: false, default: false, desc: 'Generate plans in reverse date order. Default false' },
    { name: 'stTime', type: 'string', required: false, desc: 'Scheduler time in HH:mm:ss; required when the selected flow reports hasSt=true' },
  ];
}
