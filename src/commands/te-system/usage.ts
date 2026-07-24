import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  assertEnum,
  createAdminCommand,
  optionalString,
  withQuery,
} from './shared.js';

const GROUP_BY = ['user', 'model', 'date', 'app_type'] as const;
const SORT_BY = ['totalTokens', 'cost', 'share', 'requestCount'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;
const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

function validateDatePair(ctx: RuntimeContext, required: boolean): void {
  const startDate = optionalString(ctx, 'start-date');
  const endDate = optionalString(ctx, 'end-date');
  if (Boolean(startDate) !== Boolean(endDate)) {
    throw new CliValidationError('--start-date and --end-date must be provided together');
  }
  if (required && (!startDate || !endDate)) {
    throw new CliValidationError('--start-date and --end-date are required for usage details');
  }
}

function usageRangeQuery(ctx: RuntimeContext): Record<string, string | number | undefined> {
  return {
    days: ctx.optionalNum('days'),
    startDate: optionalString(ctx, 'start-date'),
    endDate: optionalString(ctx, 'end-date'),
  };
}

export const getUsageSummary = createAdminCommand({
  command: '+get-usage-summary',
  description: 'Get company token and cost usage summary',
  flags: [
    { name: 'days', type: 'number', min: 1, max: 365, desc: 'Relative range in days (1-365, default: 30)' },
    {
      name: 'start-date',
      type: 'string',
      pattern: DATE_PATTERN,
      desc: 'Start date (YYYY-MM-DD); requires --end-date',
    },
    {
      name: 'end-date',
      type: 'string',
      pattern: DATE_PATTERN,
      desc: 'End date (YYYY-MM-DD); requires --start-date',
    },
  ],
  risk: 'read',
  validate: (ctx) => validateDatePair(ctx, false),
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/stats/summary', usageRangeQuery(ctx)),
  }),
});

export const getUsageDetails = createAdminCommand({
  command: '+get-usage-details',
  description: 'Get paginated company usage details grouped by one dimension',
  flags: [
    {
      name: 'start-date',
      type: 'string',
      required: true,
      pattern: DATE_PATTERN,
      desc: 'Start date (YYYY-MM-DD)',
    },
    {
      name: 'end-date',
      type: 'string',
      required: true,
      pattern: DATE_PATTERN,
      desc: 'End date (YYYY-MM-DD)',
    },
    { name: 'group-by', type: 'string', default: 'user', desc: `Group by: ${GROUP_BY.join(' | ')}` },
    { name: 'search', type: 'string', maxLength: 100, desc: 'Optional search text (max 100 characters)' },
    { name: 'open-id', type: 'string', desc: 'Filter by TE user openId' },
    { name: 'model-id', type: 'string', desc: 'Filter by model ID' },
    { name: 'model-scope', type: 'string', desc: 'Model scope; requires --model-id' },
    { name: 'app-type', type: 'string', desc: 'Filter by product/application type' },
    { name: 'page', type: 'number', min: 1, desc: 'Page number (default: 1)' },
    { name: 'page-size', type: 'number', min: 1, max: 100, desc: 'Page size (1-100, default: 20)' },
    { name: 'sort-by', type: 'string', default: 'totalTokens', desc: `Sort by: ${SORT_BY.join(' | ')}` },
    { name: 'sort-dir', type: 'string', default: 'desc', desc: `Sort direction: ${SORT_DIRECTIONS.join(' | ')}` },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateDatePair(ctx, true);
    assertEnum('group-by', optionalString(ctx, 'group-by'), GROUP_BY);
    assertEnum('sort-by', optionalString(ctx, 'sort-by'), SORT_BY);
    assertEnum('sort-dir', optionalString(ctx, 'sort-dir'), SORT_DIRECTIONS);
    if (optionalString(ctx, 'model-scope') && !optionalString(ctx, 'model-id')) {
      throw new CliValidationError('--model-scope requires --model-id');
    }
  },
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/stats/details', {
      startDate: ctx.str('start-date'),
      endDate: ctx.str('end-date'),
      groupBy: ctx.str('group-by') || 'user',
      search: optionalString(ctx, 'search'),
      openId: optionalString(ctx, 'open-id'),
      modelId: optionalString(ctx, 'model-id'),
      modelScope: optionalString(ctx, 'model-scope'),
      appType: optionalString(ctx, 'app-type'),
      page: ctx.optionalNum('page'),
      pageSize: ctx.optionalNum('page-size'),
      sortBy: ctx.str('sort-by') || 'totalTokens',
      sortDir: ctx.str('sort-dir') || 'desc',
    }),
  }),
});

export const usageCommands: Command[] = [getUsageSummary, getUsageDetails];
