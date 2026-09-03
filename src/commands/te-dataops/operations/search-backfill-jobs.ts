import type { Command, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  hasValue,
  optionalBoolean,
  validateDateRange,
  validateEnum,
  validateIsoDate,
} from './backfill-options.js';

const toolName = 'operations_search_backfill_jobs';
const JOB_TYPES = ['TASK_ALL', 'TASK_ONLY', 'TASK_PRE', 'TASK_POST'] as const;
const JOB_STATUSES = ['DRAFT', 'RUNNING', 'STOP', 'FAIL', 'SUCCESS', 'READY_STOP'] as const;
const JOB_SORTS = ['ID', 'JOB_NAME', 'CREATE_TIME', 'UPDATE_TIME', 'START_DATE', 'END_DATE'] as const;

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    keyword: ctx.str('keyword'),
    startDate: ctx.str('startDate'),
    endDate: ctx.str('endDate'),
    jobType: ctx.str('jobType'),
    status: ctx.str('status'),
    owners: hasValue(ctx, 'owners') ? ctx.json('owners') : undefined,
    sort: ctx.str('sort'),
    sortAscending: optionalBoolean(ctx, 'sortAscending'),
    pageNum: ctx.optionalNum('pageNum'),
    pageSize: ctx.optionalNum('pageSize'),
  };
}

function validateSearch(ctx: RuntimeContext): void {
  const startDate = ctx.str('startDate');
  const endDate = ctx.str('endDate');
  if (startDate !== '') validateIsoDate(startDate, 'startDate');
  if (endDate !== '') validateIsoDate(endDate, 'endDate');
  if (startDate !== '' && endDate !== '') validateDateRange(startDate, endDate);

  validateEnum(ctx, 'jobType', JOB_TYPES);
  validateEnum(ctx, 'sort', JOB_SORTS);

  const status = ctx.str('status');
  if (status !== '') {
    const statuses = status.split(',').map((value) => value.trim());
    if (statuses.some((value) => !JOB_STATUSES.includes(value as typeof JOB_STATUSES[number]))) {
      throw new CliValidationError(`--status must contain only: ${JOB_STATUSES.join(', ')}`, {
        location: { field: 'status' },
      });
    }
  }

  if (hasValue(ctx, 'owners')) {
    const owners = ctx.json('owners');
    if (!Array.isArray(owners) || owners.some((owner) => typeof owner !== 'string' || owner.trim() === '')) {
      throw new CliValidationError('--owners must be a JSON array of non-empty strings', {
        location: { field: 'owners' },
      });
    }
  }
}

export const searchBackfillJobs: Command = {
  service: 'dataops_operations',
  command: '+search_backfill_jobs',
  description: 'Search backfill jobs in a space. Filters and pagination are optional; use jobId from the result for detail and lifecycle actions.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'keyword', type: 'string', required: false, desc: 'Optional job ID, job name, flow name, or remark keyword' },
    { name: 'startDate', type: 'string', required: false, desc: 'Optional execution start date in yyyy-MM-dd format' },
    { name: 'endDate', type: 'string', required: false, desc: 'Optional execution end date in yyyy-MM-dd format' },
    { name: 'jobType', type: 'string', required: false, desc: 'Optional job type: TASK_ALL, TASK_ONLY, TASK_PRE, or TASK_POST' },
    { name: 'status', type: 'string', required: false, desc: 'Optional comma-separated statuses: DRAFT,RUNNING,STOP,FAIL,SUCCESS,READY_STOP' },
    { name: 'owners', type: 'json', required: false, desc: 'Optional JSON array of owner open IDs' },
    { name: 'sort', type: 'string', required: false, desc: 'Optional sort field: ID, JOB_NAME, CREATE_TIME, UPDATE_TIME, START_DATE, or END_DATE' },
    { name: 'sortAscending', type: 'boolean', required: false, desc: 'Sort ascending when true; server default is descending' },
    { name: 'pageNum', type: 'number', required: false, min: 1, desc: 'Optional page number; server default 1' },
    { name: 'pageSize', type: 'number', required: false, min: 1, max: 100, desc: 'Optional page size; server default 20, max 100' },
  ],
  risk: 'read',
  validate: validateSearch,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
