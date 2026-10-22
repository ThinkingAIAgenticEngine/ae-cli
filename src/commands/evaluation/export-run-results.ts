import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/export`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const format = ctx.str('export-format');
  if (format) params.format = format;
  return params;
}

export const exportRunResults: Command = {
  service: 'evaluation',
  command: '+export_run_results',
  description:
    'Queue an asynchronous export of an evaluation run result via POST /agenteval/api/v1/evaluation-runs/{runId}/export. Requires an Idempotency-Key; returns 202 with File metadata (poll +get_file until COMPLETED, then use file download --output <path>).',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
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
