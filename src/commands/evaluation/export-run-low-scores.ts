import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/low-score-export`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = { max_score: ctx.num('max-score') };
  const format = ctx.str('export-format');
  if (format) params.format = format;
  const minScore = ctx.optionalNum('min-score');
  if (minScore !== undefined) params.min_score = minScore;
  const status = ctx.str('status');
  if (status) params.status = status;
  return params;
}

export const exportRunLowScores: Command = {
  service: 'evaluation',
  command: '+export_run_low_scores',
  description:
    'Queue an asynchronous export of low-scoring case results via POST /agenteval/api/v1/evaluation-runs/{runId}/low-score-export. Requires --max-score and an Idempotency-Key; returns 202 with File metadata (poll +get_file until COMPLETED, then use file download --output <path>).',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    { name: 'max-score', type: 'number', required: true, min: 0, max: 1, desc: 'Upper score bound (0-1); only cases scoring <= this value are exported' },
    { name: 'min-score', type: 'number', min: 0, max: 1, desc: 'Optional lower score bound (0-1)' },
    { name: 'status', type: 'string', desc: 'Optional case status filter, e.g. SUCCEEDED | FAILED' },
    { name: 'export-format', type: 'string', desc: 'Export format: CSV | JSONL (default CSV)' },
    {
      name: 'idempotency-key',
      type: 'string',
      required: true,
      hint: 'Required. Use a fresh value per export attempt (max 191 chars) sent as the Idempotency-Key header.',
      desc: 'Unique Idempotency-Key header value (1-191 characters)',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), buildParams(ctx), undefined, {
    idempotencyKey: ctx.str('idempotency-key'),
  }),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), buildParams(ctx), undefined, {
    idempotencyKey: ctx.str('idempotency-key'),
  }),
};
