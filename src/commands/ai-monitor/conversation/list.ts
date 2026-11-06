import { advancedFilterFlags, buildAdvancedFilterInput } from '../advanced-filters.js';
import type { RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import {
  createAiMonitorCapabilityCommand,
  normalizedSortOrder,
  optionalString,
  prepareAiMonitorScope,
  scopeValue,
  validateDateRange,
} from '../shared.js';

const SORT_FIELDS: Record<string, string> = {
  'trace-count': 'trace_count',
  'total-duration': 'total_duration',
  'avg-duration': 'avg_duration',
  'max-duration': 'max_duration',
  'min-duration': 'min_duration',
  'total-token-count': 'total_token_count',
  'prompt-token-count': 'total_token_count_prompt',
  'completion-token-count': 'total_token_count_completion',
  'total-error-span-count': 'total_error_span_count',
  'total-span-count': 'total_span_count',
  'error-trace-count': 'error_trace_count',
  'start-time': 'start_time',
  'end-time': 'end_time',
  'recorded-costs': 'recorded_costs',
};

function normalizedSortBy(ctx: RuntimeContext): string {
  const value = ctx.str('sort-by');
  const normalized = SORT_FIELDS[value];
  if (!normalized) {
    throw new CliValidationError('--sort-by has an unsupported value.', {
      code: 'INVALID_CONVERSATION_SORT_FIELD',
      hint: `Use one of: ${Object.keys(SORT_FIELDS).join(', ')}.`,
    });
  }
  return normalized;
}

export function buildConversationListInput(ctx: RuntimeContext) {
  return {
    ...buildAdvancedFilterInput(ctx),
    data_token: scopeValue(ctx, 'platform', 'data-token', 'AE-AGENT'),
    report_source: scopeValue(ctx, 'environment', 'report-source', '__default__'),
    last_days: ctx.num('last-days'),
    start_date: optionalString(ctx, 'start-date'),
    end_date: optionalString(ctx, 'end-date'),
    agent: optionalString(ctx, 'agent'),
    channel: optionalString(ctx, 'channel'),
    search: optionalString(ctx, 'search'),
    limit: ctx.num('limit'),
    offset: ctx.num('offset'),
    sort_by: normalizedSortBy(ctx),
    sort_order: normalizedSortOrder(ctx),
  };
}

function flattenConversationListResult(result: unknown): unknown {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  const data = (result as Record<string, unknown>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
  const { data: _data, ...metadata } = result as Record<string, unknown>;
  return { ...(data as Record<string, unknown>), ...metadata };
}

export const conversationList = createAiMonitorCapabilityCommand({
  resource: 'conversation',
  command: 'list',
  capabilityId: 'ai_monitor.conversation.list',
  description: 'List conversations in your company.',
  helpText: 'Explicit --start-date and --end-date override --last-days. recorded-costs sorts recorded amounts within fee-unit groups; it does not sum across currencies.',
  flags: [
    ...advancedFilterFlags,
    { name: 'platform', type: 'string', desc: 'Agent platform name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'environment', type: 'string', desc: 'Runtime environment name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'data-token', type: 'string', desc: 'Advanced compatibility flag for the Agent platform key. Default: AE-AGENT.', minLength: 1, maxLength: 255 },
    { name: 'report-source', type: 'string', desc: 'Advanced compatibility flag for the runtime environment key. Default: __default__.', minLength: 1, maxLength: 255 },
    { name: 'last-days', type: 'number', default: 7, desc: 'Lookback in days when no explicit date range is provided. Default: 7.', min: 1, max: 30 },
    { name: 'start-date', type: 'string', desc: 'Inclusive start date in YYYY-MM-DD format.', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    { name: 'end-date', type: 'string', desc: 'Inclusive end date in YYYY-MM-DD format.', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    { name: 'agent', type: 'string', desc: 'Filter by exact agent name.', minLength: 1, maxLength: 255 },
    { name: 'channel', type: 'string', desc: 'Filter by exact agent channel.', minLength: 1, maxLength: 255 },
    { name: 'search', type: 'string', desc: 'Search conversation IDs and conversation metadata.', minLength: 1, maxLength: 500 },
    { name: 'limit', type: 'number', default: 20, desc: 'Page size. Default: 20, max: 100.', min: 1, max: 100 },
    { name: 'offset', type: 'number', default: 0, desc: 'Zero-based page offset. Default: 0.', min: 0 },
    { name: 'sort-by', type: 'string', default: 'start-time', desc: 'Sort field: trace-count, total-duration, avg-duration, max-duration, min-duration, total-token-count, prompt-token-count, completion-token-count, total-error-span-count, total-span-count, error-trace-count, start-time, end-time, or recorded-costs (within fee-unit groups).' },
    { name: 'sort-order', type: 'string', default: 'desc', desc: 'Sort order: asc or desc. Default: desc.' },
  ],
  risk: 'read',
  validate: validateDateRange,
  buildInput: buildConversationListInput,
  prepareInput: prepareAiMonitorScope,
  postProcess: flattenConversationListResult,
});
