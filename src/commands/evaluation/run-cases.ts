import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const status = ctx.str('status');
  if (status) params.status = status;
  const evidenceCompleteness = ctx.str('evidence-completeness');
  if (evidenceCompleteness) params.evidence_completeness = evidenceCompleteness;
  const search = ctx.str('search');
  if (search) params.search = search;
  const evaluationStatus = ctx.str('evaluation-status');
  if (evaluationStatus) params.evaluation_status = evaluationStatus;
  const scoreStatus = ctx.str('score-status');
  if (scoreStatus) params.score_status = scoreStatus;
  const evaluatorId = ctx.str('evaluator-id');
  if (evaluatorId) params.evaluator_id = evaluatorId;
  const evaluatorIds = ctx.json('evaluator-ids');
  if (evaluatorIds !== undefined) {
    if (
      !Array.isArray(evaluatorIds) ||
      evaluatorIds.length < 1 ||
      evaluatorIds.length > 8 ||
      !evaluatorIds.every((v) => typeof v === 'string')
    ) {
      throw new Error('--evaluator-ids must be a JSON array of 1-8 run evaluator UUIDs, e.g. \'["<uuid>"]\'');
    }
    params.evaluator_ids = evaluatorIds.join(',');
  }
  const minScore = ctx.optionalNum('min-score');
  if (minScore !== undefined) params.min_score = minScore;
  const maxScore = ctx.optionalNum('max-score');
  if (maxScore !== undefined) params.max_score = maxScore;
  const scoreGte = ctx.optionalNum('score-gte');
  if (scoreGte !== undefined) params.score_gte = scoreGte;
  const scoreLte = ctx.optionalNum('score-lte');
  if (scoreLte !== undefined) params.score_lte = scoreLte;
  const fieldFilters = ctx.json('field-filters-json');
  if (fieldFilters !== undefined) {
    if (!Array.isArray(fieldFilters) || fieldFilters.length > 5) {
      throw new Error('--field-filters-json must be a JSON array of at most 5 typed filters');
    }
    params.field_filters = JSON.stringify(fieldFilters);
  }
  const sort = ctx.str('sort');
  if (sort) params.sort = sort;
  const sortEvaluatorId = ctx.str('sort-evaluator-id');
  if (sortEvaluatorId) params.sort_evaluator_id = sortEvaluatorId;
  const order = ctx.str('order');
  if (order) params.order = order;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  const limit = ctx.optionalNum('limit');
  if (limit !== undefined) params.limit = limit;
  const offset = ctx.optionalNum('offset');
  if (offset !== undefined) params.offset = offset;
  return params;
}

export const runCases: Command = {
  service: 'evaluation',
  command: '+run_cases',
  description:
    'List evaluation run case results via GET /agenteval/api/v1/evaluation-runs/{runId}/cases with rich filtering (status, evidence completeness, free-text search, evaluation/score status, evaluator scope, score range, frozen field filters, sort). Returns a cursor-paginated page.',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    {
      name: 'status',
      type: 'string',
      desc: 'Filter by case status: PENDING | RUNNING | BLOCKED | SUCCEEDED | FAILED | CANCELLED | UNKNOWN',
    },
    {
      name: 'evidence-completeness',
      type: 'string',
      desc: 'Filter by evidence completeness: NONE | PARTIAL | COMPLETE | UNKNOWN',
    },
    {
      name: 'search',
      type: 'string',
      maxLength: 128,
      sensitive: true,
      desc: 'Free-text search (max 128) matching Agent output, public errors, external run/session IDs and runtime fingerprint; redacted from logs',
    },
    {
      name: 'evaluation-status',
      type: 'string',
      desc: 'Filter by evaluation status: PENDING | RUNNING | SUCCEEDED | PARTIALLY_FAILED | FAILED | CANCELLED',
    },
    {
      name: 'score-status',
      type: 'string',
      desc: 'Filter by score status: PENDING | RUNNING | SUCCEEDED | FAILED | CANCELLED',
    },
    { name: 'evaluator-id', type: 'string', desc: 'Filter by a single run evaluator UUID' },
    {
      name: 'evaluator-ids',
      type: 'json',
      desc: 'JSON array of 1-8 run evaluator UUIDs, e.g. \'["<uuid-1>","<uuid-2>"]\' (from +list_run_evaluators)',
    },
    { name: 'min-score', type: 'number', min: 0, max: 1, desc: 'Minimum average score (0-1)' },
    { name: 'max-score', type: 'number', min: 0, max: 1, desc: 'Maximum average score (0-1)' },
    { name: 'score-gte', type: 'number', min: 0, max: 1, desc: 'Minimum evaluator score (0-1)' },
    { name: 'score-lte', type: 'number', min: 0, max: 1, desc: 'Maximum evaluator score (0-1)' },
    {
      name: 'field-filters-json',
      type: 'json',
      sensitive: true,
      desc: 'JSON array of up to 5 typed filters over frozen result fields; each needs field_key and may combine state=VALUE with one typed criterion, while numeric filters may use both number_gte and number_lte, e.g. \'[{"field_key":"score","number_gte":0.5,"number_lte":1}]\'',
    },
    {
      name: 'sort',
      type: 'string',
      desc: 'Sort key: MIN_SCORE | AVERAGE_SCORE | EVALUATOR_SCORE (pair EVALUATOR_SCORE with --sort-evaluator-id)',
    },
    { name: 'sort-evaluator-id', type: 'string', desc: 'Run evaluator UUID used when --sort EVALUATOR_SCORE' },
    { name: 'order', type: 'string', desc: 'Sort order: asc | desc (default asc)' },
    { name: 'cursor', type: 'string', desc: 'Opaque pagination cursor from the previous page' },
    { name: 'limit', type: 'number', min: 1, max: 1000, desc: 'Page size (1-1000, default 50)' },
    { name: 'offset', type: 'number', min: 0, desc: 'Non-negative offset into the result set (default 0)' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
};
