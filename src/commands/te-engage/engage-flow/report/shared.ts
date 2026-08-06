import type { Flag, RuntimeContext } from '../../../../framework/types.js';
import { printError } from '../../../../framework/output.js';
import { readOptionalBoolean } from '../../utils.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const flowReportCommonFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'flow-id', type: 'string', required: false, desc: 'Logical flow ID.' },
  { name: 'flow-uuid', type: 'string', required: false, desc: 'Flow version UUID.' },
  { name: 'request-id', type: 'string', required: false, desc: 'Query correlation ID. Generated when omitted.' },
  { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code.' },
  { name: 'show-time-zone', type: 'string', required: false, desc: 'Display timezone offset.' },
];

export const flowMetricDetailFlags: Flag[] = [
  ...flowReportCommonFlags,
  { name: 'node-uuid', type: 'string', required: true, desc: 'Flow node UUID.' },
  { name: 'start-time', type: 'string', required: true, desc: 'Start date in yyyy-MM-dd format.' },
  { name: 'end-time', type: 'string', required: true, desc: 'End date in yyyy-MM-dd format.' },
  { name: 'branch-id', type: 'string', required: false, desc: 'Optional branch ID.' },
  { name: 'indicator-name', type: 'string', required: false, desc: 'Optional indicator name.' },
  { name: 'indicators-uuid', type: 'string', required: false, desc: 'Optional AB metric indicator UUID.' },
  { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type, usually uv or pv.' },
  { name: 'report-mode', type: 'string', required: false, desc: 'Metric report mode: node or ab. Defaults to node.' },
];

export const flowUserDetailFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'flow-id', type: 'string', required: false, desc: 'Logical flow ID.' },
  { name: 'flow-uuid', type: 'string', required: false, desc: 'Flow version UUID.' },
  { name: 'request-id', type: 'string', required: false, desc: 'Query correlation ID. Generated when omitted.' },
  { name: 'cluster-def', type: 'string', required: false, desc: 'Legacy cluster definition JSON. Prefer the report metric fields below.' },
  { name: 'indicator-name', type: 'string', required: false, desc: 'Metric key returned by the corresponding flow report.' },
  { name: 'data-view-type', type: 'string', required: false, desc: 'Data view type. Defaults to 2 (date view).' },
  { name: 'is-summary', type: 'boolean', required: false, desc: 'Whether to query a summary segment. Defaults to false.' },
  { name: 'start-time', type: 'string', required: false, desc: 'Segment start date in yyyy-MM-dd format.' },
  { name: 'end-time', type: 'string', required: false, desc: 'Segment end date in yyyy-MM-dd format.' },
  { name: 'push-language-code', type: 'string', required: false, desc: 'Optional push language code from the report context.' },
  { name: 'user-time-zone', type: 'string', required: false, desc: 'Optional user timezone.' },
  { name: 'show-time-zone', type: 'string', required: false, desc: 'Optional report display timezone.' },
  { name: 'node-uuid', type: 'string', required: false, desc: 'Flow node UUID.' },
  { name: 'branch-id', type: 'string', required: false, desc: 'Optional branch ID.' },
];

export const flowNodeUserDetailFlags: Flag[] = flowUserDetailFlags.map(flag => (
  flag.name === 'node-uuid' ? { ...flag, required: true } : flag
));

export const inlineLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Maximum number of rows returned inline. Defaults to backend value.',
};

export const timeoutSecondsFlag: Flag = {
  name: 'timeout-seconds',
  type: 'number',
  required: false,
  desc: 'Query or export timeout in seconds. Defaults to backend policy.',
};

export const exportFormatFlags: Flag[] = [
  {
    name: 'artifact-format',
    type: 'string',
    required: false,
    desc: 'Export artifact format. Flow report and user detail exports support csv or jsonl. Defaults to jsonl.',
  },
];

export function validateFlowReportInput(ctx: RuntimeContext): void {
  if (!ctx.str('flow-id') && !ctx.str('flow-uuid')) {
    printError('validation', 'At least one of --flow-id or --flow-uuid is required');
    process.exit(1);
  }
  validateDate(ctx.str('start-time'), '--start-time');
  validateDate(ctx.str('end-time'), '--end-time');
}

export function validateFlowUserDetailInput(ctx: RuntimeContext): void {
  if (!ctx.str('flow-id') && !ctx.str('flow-uuid')) {
    printError('validation', 'At least one of --flow-id or --flow-uuid is required');
    process.exit(1);
  }
  if (!ctx.str('cluster-def')
    && (!ctx.str('indicator-name') || !ctx.str('start-time') || !ctx.str('end-time'))) {
    printError('validation', 'Pass either --cluster-def or --indicator-name with --start-time and --end-time');
    process.exit(1);
  }
  validateDate(ctx.str('start-time'), '--start-time');
  validateDate(ctx.str('end-time'), '--end-time');
}

export function buildFlowReportInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    flow_id: ctx.str('flow-id') || undefined,
    flow_uuid: ctx.str('flow-uuid') || undefined,
    request_id: ctx.str('request-id') || undefined,
    push_language_code: ctx.str('push-language-code') || undefined,
    show_time_zone: ctx.str('show-time-zone') || undefined,
    node_uuid: ctx.str('node-uuid') || undefined,
    branch_id: ctx.str('branch-id') || undefined,
    indicator_name: ctx.str('indicator-name') || undefined,
    indicators_uuid: ctx.str('indicators-uuid') || undefined,
    data_dim_type: ctx.str('data-dim-type') || undefined,
    start_time: ctx.str('start-time') || undefined,
    end_time: ctx.str('end-time') || undefined,
    report_mode: ctx.str('report-mode') || undefined,
    cluster_def: ctx.str('cluster-def') || undefined,
    limit: ctx.optionalNum('limit'),
    format: ctx.str('artifact-format') || undefined,
    timeout_seconds: ctx.optionalNum('timeout-seconds'),
  };
}

export function buildFlowUserDetailInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    flow_id: ctx.str('flow-id') || undefined,
    flow_uuid: ctx.str('flow-uuid') || undefined,
    request_id: ctx.str('request-id') || undefined,
    node_uuid: ctx.str('node-uuid') || undefined,
    branch_id: ctx.str('branch-id') || undefined,
    cluster_def: ctx.str('cluster-def') || undefined,
    indicator_name: ctx.str('indicator-name') || undefined,
    data_view_type: ctx.str('data-view-type') || undefined,
    is_summary: readOptionalBoolean(ctx, 'is-summary'),
    start_time: ctx.str('start-time') || undefined,
    end_time: ctx.str('end-time') || undefined,
    push_language_code: ctx.str('push-language-code') || undefined,
    user_time_zone: ctx.str('user-time-zone') || undefined,
    show_time_zone: ctx.str('show-time-zone') || undefined,
    limit: ctx.optionalNum('limit'),
    format: ctx.str('artifact-format') || undefined,
    timeout_seconds: ctx.optionalNum('timeout-seconds'),
  };
}

function validateDate(value: string, flag: string): void {
  if (value && !ISO_DATE.test(value)) {
    printError('validation', `${flag} must be in yyyy-MM-dd format`);
    process.exit(1);
  }
}
