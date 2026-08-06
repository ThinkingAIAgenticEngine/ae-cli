import { resolve } from 'node:path';

import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  assertEnum,
  createAdminCommand,
  createAdminDownloadCommand,
  optionalString,
  withQuery,
} from './shared.js';

const GROUP_BY = ['user', 'model', 'date', 'app_type'] as const;
const SORT_BY = ['totalTokens', 'cost', 'share', 'requestCount'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;
const EXPORT_SCOPES = ['full', 'drill'] as const;
const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

function validateDatePair(ctx: RuntimeContext, required: boolean, supportsDays = false): void {
  const startDate = optionalString(ctx, 'start-date');
  const endDate = optionalString(ctx, 'end-date');
  const days = ctx.optionalNum('days');
  if (Boolean(startDate) !== Boolean(endDate)) {
    throw new CliValidationError('--start-date and --end-date must be provided together');
  }
  if (required && (!startDate || !endDate)) {
    throw new CliValidationError('--start-date and --end-date are required');
  }
  if (supportsDays && days !== undefined && startDate) {
    throw new CliValidationError('--days cannot be combined with --start-date/--end-date');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new CliValidationError('--start-date cannot be later than --end-date');
  }
}

function usageRangeQuery(ctx: RuntimeContext): Record<string, string | number | undefined> {
  return {
    days: ctx.optionalNum('days'),
    startDate: optionalString(ctx, 'start-date'),
    endDate: optionalString(ctx, 'end-date'),
  };
}

function usageCombinationQuery(ctx: RuntimeContext): Record<string, string | number | undefined> {
  return {
    startDate: ctx.str('start-date'),
    endDate: ctx.str('end-date'),
    parentDimension: ctx.str('parent-dimension'),
    openId: optionalString(ctx, 'open-id'),
    modelId: optionalString(ctx, 'model-id'),
    modelScope: optionalString(ctx, 'model-scope'),
    appType: optionalString(ctx, 'app-type'),
    date: optionalString(ctx, 'date'),
    page: ctx.optionalNum('page'),
    pageSize: ctx.optionalNum('page-size'),
    sortBy: optionalString(ctx, 'sort-by') || 'totalTokens',
    sortDir: optionalString(ctx, 'sort-dir') || 'desc',
  };
}

function validateUsageCombination(ctx: RuntimeContext): void {
  validateDatePair(ctx, true);
  const parent = optionalString(ctx, 'parent-dimension');
  assertEnum('parent-dimension', parent, GROUP_BY);
  assertEnum('sort-by', optionalString(ctx, 'sort-by'), SORT_BY);
  assertEnum('sort-dir', optionalString(ctx, 'sort-dir'), SORT_DIRECTIONS);

  const openId = optionalString(ctx, 'open-id');
  const modelId = optionalString(ctx, 'model-id');
  const modelScope = optionalString(ctx, 'model-scope');
  const appType = optionalString(ctx, 'app-type');
  const date = optionalString(ctx, 'date');
  const supplied = [openId, modelId, modelScope, appType, date].filter(Boolean).length;
  if (parent === 'user' && (!openId || supplied !== 1)) {
    throw new CliValidationError('user drill-down requires only --open-id');
  }
  if (parent === 'model' && (!modelId || !modelScope || supplied !== 2)) {
    throw new CliValidationError('model drill-down requires only --model-id and --model-scope');
  }
  if (parent === 'app_type' && (!appType || supplied !== 1)) {
    throw new CliValidationError('app_type drill-down requires only --app-type');
  }
  if (parent === 'date' && (!date || supplied !== 1)) {
    throw new CliValidationError('date drill-down requires only --date');
  }
  if (date && (date < ctx.str('start-date') || date > ctx.str('end-date'))) {
    throw new CliValidationError('--date must be within --start-date and --end-date');
  }
}

const COMBINATION_FLAGS = [
  { name: 'start-date', type: 'string' as const, required: true, pattern: DATE_PATTERN, desc: 'Start date (YYYY-MM-DD)' },
  { name: 'end-date', type: 'string' as const, required: true, pattern: DATE_PATTERN, desc: 'End date (YYYY-MM-DD)' },
  { name: 'parent-dimension', type: 'string' as const, required: true, desc: `Parent dimension: ${GROUP_BY.join(' | ')}` },
  { name: 'open-id', type: 'string' as const, desc: 'Required only for user drill-down' },
  { name: 'model-id', type: 'string' as const, desc: 'Required only for model drill-down' },
  { name: 'model-scope', type: 'string' as const, desc: 'Required only for model drill-down' },
  { name: 'app-type', type: 'string' as const, desc: 'Required only for app_type drill-down' },
  { name: 'date', type: 'string' as const, pattern: DATE_PATTERN, desc: 'Required only for date drill-down' },
  { name: 'page', type: 'number' as const, min: 1, desc: 'Page number (default: 1)' },
  { name: 'page-size', type: 'number' as const, min: 1, max: 100, desc: 'Page size (1-100, default: 20)' },
  { name: 'sort-by', type: 'string' as const, default: 'totalTokens', desc: `Sort by: ${SORT_BY.join(' | ')}` },
  { name: 'sort-dir', type: 'string' as const, default: 'desc', desc: `Sort direction: ${SORT_DIRECTIONS.join(' | ')}` },
];

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
    { name: 'refresh', type: 'boolean', desc: 'Bypass the cached overview and refresh from the source' },
  ],
  risk: 'read',
  validate: (ctx) => validateDatePair(ctx, false, true),
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/stats/summary', {
      ...usageRangeQuery(ctx),
      refresh: ctx.bool('refresh') ? 'true' : undefined,
    }),
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

export const getAgentToolCalls = createAdminCommand({
  command: '+get-agent-tool-calls',
  description: 'Get the company Agent tool-call count for a usage range',
  flags: [
    { name: 'days', type: 'number', min: 1, max: 365, desc: 'Relative range in days (1-365, default: 30)' },
    { name: 'start-date', type: 'string', pattern: DATE_PATTERN, desc: 'Start date (YYYY-MM-DD); requires --end-date' },
    { name: 'end-date', type: 'string', pattern: DATE_PATTERN, desc: 'End date (YYYY-MM-DD); requires --start-date' },
    { name: 'refresh', type: 'boolean', desc: 'Bypass the cached overview and refresh from the source' },
  ],
  risk: 'read',
  validate: (ctx) => validateDatePair(ctx, false, true),
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/stats/agent-tool-calls', {
      ...usageRangeQuery(ctx),
      refresh: ctx.bool('refresh') ? 'true' : undefined,
    }),
  }),
});

export const getUsageCombinations = createAdminCommand({
  command: '+get-usage-combinations',
  description: 'Drill one usage group into the remaining dimensions',
  flags: COMBINATION_FLAGS,
  risk: 'read',
  validate: validateUsageCombination,
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/stats/combinations', usageCombinationQuery(ctx)),
  }),
});

export const exportUsage = createAdminDownloadCommand({
  command: '+export-usage',
  description: 'Export filtered one-dimension usage groups to a CSV file',
  flags: [
    { name: 'start-date', type: 'string', required: true, pattern: DATE_PATTERN, desc: 'Start date (YYYY-MM-DD)' },
    { name: 'end-date', type: 'string', required: true, pattern: DATE_PATTERN, desc: 'End date (YYYY-MM-DD)' },
    { name: 'group-by', type: 'string', default: 'user', desc: `Group by: ${GROUP_BY.join(' | ')}` },
    { name: 'search', type: 'string', maxLength: 100, desc: 'Optional search text (max 100 characters)' },
    { name: 'open-id', type: 'string', desc: 'Filter by TE user openId' },
    { name: 'model-id', type: 'string', desc: 'Filter by model ID' },
    { name: 'model-scope', type: 'string', desc: 'Model scope; requires --model-id' },
    { name: 'app-type', type: 'string', desc: 'Filter by product/application type' },
    { name: 'sort-by', type: 'string', default: 'totalTokens', desc: `Sort by: ${SORT_BY.join(' | ')}` },
    { name: 'sort-dir', type: 'string', default: 'desc', desc: `Sort direction: ${SORT_DIRECTIONS.join(' | ')}` },
    { name: 'output', type: 'string', required: true, desc: 'New local CSV path; existing files are never overwritten' },
  ],
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
    path: withQuery('/api/admin/stats/export', {
      startDate: ctx.str('start-date'),
      endDate: ctx.str('end-date'),
      groupBy: ctx.str('group-by') || 'user',
      search: optionalString(ctx, 'search'),
      openId: optionalString(ctx, 'open-id'),
      modelId: optionalString(ctx, 'model-id'),
      modelScope: optionalString(ctx, 'model-scope'),
      appType: optionalString(ctx, 'app-type'),
      sortBy: ctx.str('sort-by') || 'totalTokens',
      sortDir: ctx.str('sort-dir') || 'desc',
    }),
    outputPath: resolve(ctx.str('output')),
  }),
});

export const exportUsageDetails = createAdminDownloadCommand({
  command: '+export-usage-details',
  description: 'Export full or drill-down multi-dimension usage details to a streamed CSV file',
  flags: [
    { name: 'scope', type: 'string', required: true, desc: `Export scope: ${EXPORT_SCOPES.join(' | ')}` },
    { name: 'days', type: 'number', min: 1, max: 365, desc: 'Relative range for full export (1-365, default: 30)' },
    { name: 'start-date', type: 'string', pattern: DATE_PATTERN, desc: 'Start date (YYYY-MM-DD)' },
    { name: 'end-date', type: 'string', pattern: DATE_PATTERN, desc: 'End date (YYYY-MM-DD)' },
    ...COMBINATION_FLAGS.filter((flag) => !['start-date', 'end-date', 'page', 'page-size', 'sort-by', 'sort-dir'].includes(flag.name)).map((flag) => ({ ...flag, required: false })),
    { name: 'output', type: 'string', required: true, desc: 'New local CSV path; existing files are never overwritten' },
  ],
  validate: (ctx) => {
    const scope = optionalString(ctx, 'scope');
    assertEnum('scope', scope, EXPORT_SCOPES);
    if (scope === 'drill') {
      validateUsageCombination(ctx);
    } else {
      validateDatePair(ctx, false, true);
      if (
        optionalString(ctx, 'parent-dimension')
        || optionalString(ctx, 'open-id')
        || optionalString(ctx, 'model-id')
        || optionalString(ctx, 'model-scope')
        || optionalString(ctx, 'app-type')
        || optionalString(ctx, 'date')
      ) {
        throw new CliValidationError('full export does not accept drill-down filters');
      }
    }
  },
  prepare: (ctx) => ({
    path: withQuery('/api/admin/stats/detailed-export', {
      scope: ctx.str('scope'),
      ...usageRangeQuery(ctx),
      ...(ctx.str('scope') === 'drill' ? usageCombinationQuery(ctx) : {}),
    }),
    outputPath: resolve(ctx.str('output')),
  }),
});

export const usageCommands: Command[] = [
  getUsageSummary,
  getUsageDetails,
  getAgentToolCalls,
  getUsageCombinations,
  exportUsage,
  exportUsageDetails,
];
