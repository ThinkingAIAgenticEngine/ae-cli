import { advancedFilterFlags, buildAdvancedFilterInput } from '../advanced-filters.js';
import type { RuntimeContext } from '../../../framework/types.js';
import { createAiMonitorCapabilityCommand, normalizedSortBy, normalizedSortOrder, optionalString, prepareAiMonitorScope, scopeValue, validateDateRange } from '../shared.js';

export function buildTraceListInput(ctx: RuntimeContext) {
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

export function flattenTraceListResult(result: unknown): unknown {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  const envelope = result as Record<string, unknown>;
  const data = envelope.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
  const { data: _data, ...metadata } = envelope;
  return { ...(data as Record<string, unknown>), ...metadata };
}

export const traceList = createAiMonitorCapabilityCommand({
  resource: 'trace',
  command: 'list',
  capabilityId: 'ai_monitor.trace.list',
  description: 'List traces in your company.',
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
    { name: 'search', type: 'string', desc: 'Search trace IDs and trace metadata.', minLength: 1, maxLength: 500 },
    { name: 'limit', type: 'number', default: 20, desc: 'Page size. Default: 20, max: 100.', min: 1, max: 100 },
    { name: 'offset', type: 'number', default: 0, desc: 'Zero-based page offset. Default: 0.', min: 0 },
    { name: 'sort-by', type: 'string', default: 'start-time', desc: 'Sort field: start-time, end-time, duration, total-tokens, span-count, error-span-count, or recorded-costs (within fee-unit groups).' },
    { name: 'sort-order', type: 'string', default: 'desc', desc: 'Sort order: asc or desc. Default: desc.' },
  ],
  risk: 'read',
  validate: validateDateRange,
  buildInput: buildTraceListInput,
  prepareInput: prepareAiMonitorScope,
  postProcess: flattenTraceListResult,
});
