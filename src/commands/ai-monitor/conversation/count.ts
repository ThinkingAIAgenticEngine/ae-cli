import { advancedFilterFlags, buildAdvancedFilterInput } from '../advanced-filters.js';
import type { RuntimeContext } from '../../../framework/types.js';
import {
  createAiMonitorCapabilityCommand,
  optionalString,
  prepareAiMonitorScope,
  scopeValue,
  validateDateRange,
} from '../shared.js';

export function buildConversationCountInput(ctx: RuntimeContext) {
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
  };
}

export const conversationCount = createAiMonitorCapabilityCommand({
  resource: 'conversation',
  command: 'count',
  capabilityId: 'ai_monitor.conversation.count',
  description: 'Count conversations matching the supplied filters.',
  helpText: 'Uses the same filters as conversation list without fetching conversation rows.',
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
  ],
  risk: 'read',
  validate: validateDateRange,
  buildInput: buildConversationCountInput,
  prepareInput: prepareAiMonitorScope,
});
