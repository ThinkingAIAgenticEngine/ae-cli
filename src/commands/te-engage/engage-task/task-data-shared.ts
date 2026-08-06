import type { Flag, RuntimeContext } from '../../../framework/types.js';
import { printError } from '../../../framework/output.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const taskMetricDetailFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  { name: 'start-time', type: 'string', required: true, desc: 'Start date in yyyy-MM-dd format.' },
  { name: 'end-time', type: 'string', required: true, desc: 'End date in yyyy-MM-dd format.' },
  { name: 'metric-id-list', type: 'json', required: false, desc: 'Optional metric setting ID JSON array.' },
  { name: 'group-type', type: 'number', required: false, desc: 'Optional metric grouping mode: 1, 2, 3, or 4.' },
  { name: 'push-language-code', type: 'string', required: false, desc: 'Optional push content language code.' },
  { name: 'show-time-zone', type: 'string', required: false, desc: 'Display timezone offset, such as 8.0 or -5.0.' },
  { name: 'request-id', type: 'string', required: false, desc: 'Caller-provided report request ID.' },
];

export const taskDataDetailFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  { name: 'detail-type', type: 'string', required: true, desc: 'Detail mode: time, instance, or instance_daily.' },
  { name: 'start-time', type: 'string', required: true, desc: 'Start date in yyyy-MM-dd format.' },
  { name: 'end-time', type: 'string', required: true, desc: 'End date in yyyy-MM-dd format.' },
  { name: 'task-instance-id', type: 'string', required: false, desc: 'Task instance ID. Required when detail-type is instance_daily.' },
  { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type: uv or pv.' },
  { name: 'retention-type', type: 'string', required: false, desc: 'Optional retention mode: retention or lost.' },
  { name: 'data-view-type', type: 'number', required: false, desc: 'Triggered-task detail view type: 2 or 3.' },
  { name: 'push-language-code', type: 'string', required: false, desc: 'Optional push content language code.' },
  { name: 'show-time-zone', type: 'string', required: false, desc: 'Display timezone offset, such as 8.0 or -5.0.' },
  { name: 'request-id', type: 'string', required: false, desc: 'Caller-provided report request ID.' },
];

export function validateTaskMetricDetailInput(ctx: RuntimeContext): void {
  validateDateRange(ctx);
  const metricIdList = ctx.json('metric-id-list');
  if (metricIdList != null && !Array.isArray(metricIdList)) {
    printError('validation', '--metric-id-list must be a JSON array');
    process.exit(1);
  }
}

export function validateTaskDataDetailInput(ctx: RuntimeContext): void {
  validateDateRange(ctx);
  const detailType = ctx.str('detail-type');
  if (!['time', 'instance', 'instance_daily'].includes(detailType)) {
    printError('validation', '--detail-type must be time, instance, or instance_daily');
    process.exit(1);
  }
  if (detailType === 'instance_daily' && !ctx.str('task-instance-id')) {
    printError('validation', '--task-instance-id is required when --detail-type is instance_daily');
    process.exit(1);
  }
}

export function buildTaskMetricDetailInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    start_time: ctx.str('start-time'),
    end_time: ctx.str('end-time'),
    metric_id_list: ctx.json('metric-id-list') || undefined,
    group_type: ctx.optionalNum('group-type'),
    push_language_code: ctx.str('push-language-code') || undefined,
    show_time_zone: ctx.str('show-time-zone') || undefined,
    request_id: ctx.str('request-id') || undefined,
  };
}

export function buildTaskDataDetailInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    detail_type: ctx.str('detail-type'),
    task_instance_id: ctx.str('task-instance-id') || undefined,
    start_time: ctx.str('start-time'),
    end_time: ctx.str('end-time'),
    data_dim_type: ctx.str('data-dim-type') || undefined,
    retention_type: ctx.str('retention-type') || undefined,
    data_view_type: ctx.optionalNum('data-view-type'),
    push_language_code: ctx.str('push-language-code') || undefined,
    show_time_zone: ctx.str('show-time-zone') || undefined,
    request_id: ctx.str('request-id') || undefined,
  };
}

function validateDateRange(ctx: RuntimeContext): void {
  validateDate(ctx.str('start-time'), '--start-time');
  validateDate(ctx.str('end-time'), '--end-time');
  if (ctx.str('start-time') > ctx.str('end-time')) {
    printError('validation', '--start-time must be earlier than or equal to --end-time');
    process.exit(1);
  }
}

function validateDate(value: string, flag: string): void {
  if (value && !ISO_DATE.test(value)) {
    printError('validation', `${flag} must be in yyyy-MM-dd format`);
    process.exit(1);
  }
}
