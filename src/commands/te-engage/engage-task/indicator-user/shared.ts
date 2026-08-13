import { printError } from '../../../../framework/output.js';
import type { Flag, RuntimeContext } from '../../../../framework/types.js';
import { readOptionalBoolean } from '../../utils.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_TIME_ZONE = /^[+-]?\d{1,2}(?:\.\d+)?$/;

export const taskIndicatorUserIndicators = [
  'original_trigger',
  'plan',
  'actual_trigger',
  'trigger_success',
  'view',
  'click',
  'main',
  'secondary',
  'metric',
  'click_activate',
  'main_activate',
  'secondary_activate',
] as const;

const indicatorSet = new Set<string>(taskIndicatorUserIndicators);
const groupBySet = new Set(['batch', 'date', 'trigger', 'experiment']);
const retentionTypeSet = new Set(['retention', 'lost']);
const sourceSet = new Set(['task', 'experiment', 'metric']);
const pushLanguageCodeSet = new Set([
  'all', 'default', 'ar', 'az', 'bs', 'ca', 'zh-Hans', 'zh-Hant', 'hr', 'cs', 'da', 'nl', 'en', 'et',
  'fi', 'fr', 'ka', 'bg', 'de', 'el', 'hi', 'he', 'hu', 'id', 'it', 'ja', 'ko', 'lv', 'lt', 'ms', 'nb',
  'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sr', 'sk', 'es', 'sv', 'th', 'tr', 'uk', 'vi',
]);
const lostUnsupportedIndicatorSet = new Set([
  'original_trigger', 'metric', 'click_activate', 'main_activate', 'secondary_activate',
]);

export const taskIndicatorUserFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  {
    name: 'indicator',
    type: 'string',
    required: true,
    desc: `Indicator segment. Values: ${taskIndicatorUserIndicators.join(', ')}.`,
  },
  { name: 'start-time', type: 'string', required: true, desc: 'Segment start date in yyyy-MM-dd format.' },
  { name: 'end-time', type: 'string', required: true, desc: 'Segment end date in yyyy-MM-dd format.' },
  {
    name: 'group-by',
    type: 'string',
    required: false,
    desc: 'Grouping context: batch, date, trigger, or experiment. Activate indicators require and default to experiment; others default to date.',
  },
  { name: 'is-summary', type: 'boolean', required: false, desc: 'Whether to query a summary segment. Defaults to true.' },
  {
    name: 'retention-type',
    type: 'string',
    required: false,
    desc: 'Segment mode: retention or lost. Defaults to retention.',
  },
  {
    name: 'source',
    type: 'string',
    required: false,
    desc: 'Report source: task, experiment, or metric. Defaults to metric for metric indicators, experiment for activate indicators or experiment grouping, and task otherwise.',
  },
  { name: 'secondary-index', type: 'number', required: false, desc: 'Secondary indicator index from 1 to 10.' },
  { name: 'metric-id', type: 'string', required: false, desc: 'Metric setting ID; required when --indicator=metric.' },
  { name: 'task-instance-id', type: 'string', required: false, desc: 'Optional non-triggered task instance ID.' },
  { name: 'exp-group-id', type: 'string', required: false, desc: 'Optional experiment group ID.' },
  { name: 'push-language-code', type: 'string', required: false, desc: 'Push language filter, such as all, default, en, zh-Hans, or zh-Hant.' },
  { name: 'user-time-zone', type: 'string', required: false, desc: 'User timezone filter: all or a decimal offset available on the task.' },
  { name: 'show-time-zone', type: 'string', required: false, desc: 'Display timezone offset from -12 to 14. Omitted or 99 uses the backend default.' },
];

export const taskIndicatorUserRequestFlag: Flag = {
  name: 'request-id',
  type: 'string',
  required: false,
  desc: 'Query correlation ID. Generated when omitted.',
};

export const taskIndicatorUserLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Maximum number of rows returned inline. Defaults to backend policy.',
};

export const taskIndicatorUserTimeoutFlag: Flag = {
  name: 'timeout-seconds',
  type: 'number',
  required: false,
  desc: 'Query or export timeout in seconds. Defaults to backend policy.',
};

export const taskIndicatorUserFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Export artifact format: csv or jsonl. Defaults to jsonl.',
};

export function validateTaskIndicatorUserInput(ctx: RuntimeContext): void {
  const indicator = ctx.str('indicator');
  if (!indicatorSet.has(indicator)) {
    fail(`--indicator must be one of: ${taskIndicatorUserIndicators.join(', ')}`);
  }
  validateDate(ctx.str('start-time'), '--start-time');
  validateDate(ctx.str('end-time'), '--end-time');
  if (ctx.str('start-time') > ctx.str('end-time')) {
    fail('--start-time must be earlier than or equal to --end-time');
  }
  validateOptionalSet(ctx.str('group-by'), '--group-by', groupBySet);
  validateOptionalSet(ctx.str('retention-type'), '--retention-type', retentionTypeSet);
  validateOptionalSet(ctx.str('source'), '--source', sourceSet);
  validateOptionalSet(ctx.str('push-language-code'), '--push-language-code', pushLanguageCodeSet);
  validateShowTimeZone(ctx.str('show-time-zone'));
  validateUserTimeZone(ctx.str('user-time-zone'));

  const secondary = indicator === 'secondary' || indicator === 'secondary_activate';
  const secondaryIndex = ctx.optionalNum('secondary-index');
  if (secondary && (secondaryIndex === undefined || !Number.isInteger(secondaryIndex)
    || secondaryIndex < 1 || secondaryIndex > 10)) {
    fail('--secondary-index must be an integer from 1 to 10 for secondary indicators');
  }
  if (!secondary && secondaryIndex !== undefined) {
    fail('--secondary-index is only accepted for secondary indicators');
  }
  if (indicator === 'metric' && !ctx.str('metric-id')) {
    fail('--metric-id is required when --indicator=metric');
  }
  if (indicator !== 'metric' && ctx.str('metric-id')) {
    fail('--metric-id is only accepted when --indicator=metric');
  }
  const source = ctx.str('source');
  const metric = indicator === 'metric';
  if (metric && source && source !== 'metric') {
    fail('--source must be metric when --indicator=metric');
  }
  if (!metric && source === 'metric') {
    fail('--source=metric requires --indicator=metric');
  }
  const activate = indicator === 'click_activate'
    || indicator === 'main_activate'
    || indicator === 'secondary_activate';
  const groupBy = ctx.str('group-by');
  if (activate && source && source !== 'experiment') {
    fail('--source must be experiment for activate indicators');
  }
  if (activate && groupBy && groupBy !== 'experiment') {
    fail('--group-by must be experiment for activate indicators');
  }
  if (ctx.str('retention-type') === 'lost' && lostUnsupportedIndicatorSet.has(indicator)) {
    fail(`--retention-type=lost is not supported for --indicator=${indicator}`);
  }
  const isSummary = readOptionalBoolean(ctx, 'is-summary');
  const effectiveGroupBy = groupBy || (activate ? 'experiment' : 'date');
  if (indicator === 'plan' && ctx.str('exp-group-id')) {
    fail('--exp-group-id is not supported when --indicator=plan');
  }
  if (indicator === 'plan' && effectiveGroupBy === 'experiment' && isSummary === false) {
    fail('--is-summary=false is not supported for plan indicators grouped by experiment');
  }
  if (effectiveGroupBy === 'experiment' && !metric && source && source !== 'experiment') {
    fail('--source must be experiment when --group-by=experiment');
  }
  if (effectiveGroupBy === 'batch' && isSummary === false && !ctx.str('task-instance-id')) {
    fail('--task-instance-id is required for a non-summary batch segment');
  }
  if (effectiveGroupBy === 'experiment' && isSummary === false && !ctx.str('exp-group-id')) {
    fail('--exp-group-id is required for a non-summary experiment segment');
  }
}

export function buildTaskIndicatorUserInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    indicator: ctx.str('indicator'),
    start_time: ctx.str('start-time'),
    end_time: ctx.str('end-time'),
    group_by: ctx.str('group-by') || undefined,
    is_summary: readOptionalBoolean(ctx, 'is-summary'),
    retention_type: ctx.str('retention-type') || undefined,
    source: ctx.str('source') || undefined,
    secondary_index: ctx.optionalNum('secondary-index'),
    metric_id: ctx.str('metric-id') || undefined,
    task_instance_id: ctx.str('task-instance-id') || undefined,
    exp_group_id: ctx.str('exp-group-id') || undefined,
    push_language_code: ctx.str('push-language-code') || undefined,
    user_time_zone: ctx.str('user-time-zone') || undefined,
    show_time_zone: ctx.str('show-time-zone') || undefined,
    request_id: ctx.str('request-id') || undefined,
    limit: ctx.optionalNum('limit'),
    format: ctx.str('artifact-format') || undefined,
    timeout_seconds: ctx.optionalNum('timeout-seconds'),
  };
}

function validateDate(value: string, flag: string): void {
  if (!ISO_DATE.test(value)) {
    fail(`${flag} must be in yyyy-MM-dd format`);
  }
}

function validateOptionalSet(value: string, flag: string, allowed: Set<string>): void {
  if (value && !allowed.has(value)) {
    fail(`${flag} must be one of: ${[...allowed].join(', ')}`);
  }
}

function validateShowTimeZone(value: string): void {
  if (!value) {
    return;
  }
  if (!DECIMAL_TIME_ZONE.test(value)) {
    fail('--show-time-zone must use decimal hour-offset format like 8.0 or -5.0');
  }
  const offset = Number(value);
  if ((offset < -12 || offset > 14) && offset !== 99) {
    fail('--show-time-zone must be between -12 and 14, or 99');
  }
}

function validateUserTimeZone(value: string): void {
  if (!value || value === 'all') {
    return;
  }
  if (!DECIMAL_TIME_ZONE.test(value)) {
    fail('--user-time-zone must be all or a decimal hour offset like 8.0 or -5.0');
  }
  const offset = Number(value);
  if (offset < -12 || offset > 14) {
    fail('--user-time-zone must be between -12 and 14, or all');
  }
}

function fail(message: string): never {
  printError('validation', message);
  process.exit(1);
}
