import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/datasets/ai-monitor-imports';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name') };
  const description = ctx.str('description');
  if (description) body.description = description;
  const selection = ctx.json('selection-json');
  if (selection === null || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new Error('--selection-json must be a JSON object');
  }
  const mode = (selection as Record<string, unknown>).mode;
  if (mode !== 'FILTER' && mode !== 'TRACE_IDS') {
    throw new Error('--selection-json mode must be FILTER or TRACE_IDS');
  }
  if (mode === 'FILTER') {
    const startTime = (selection as Record<string, unknown>).start_time;
    const endTime = (selection as Record<string, unknown>).end_time;
    const isDate = (value: unknown) => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const timestamp = Date.parse(`${value}T00:00:00Z`);
      return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
    };
    if (!isDate(startTime) || !isDate(endTime)) {
      throw new Error('--selection-json with mode FILTER requires start_time and end_time as YYYY-MM-DD dates');
    }
    if (Date.parse(`${startTime}T00:00:00Z`) > Date.parse(`${endTime}T00:00:00Z`)) {
      throw new Error('--selection-json end_time must not precede start_time');
    }
  }
  if (mode === 'TRACE_IDS') {
    const traceIds = (selection as Record<string, unknown>).trace_ids;
    if (
      !Array.isArray(traceIds) ||
      traceIds.length < 1 ||
      traceIds.length > 1000 ||
      !traceIds.every((v) => typeof v === 'string')
    ) {
      throw new Error('--selection-json with mode TRACE_IDS requires trace_ids: 1-1000 strings');
    }
  }
  body.selection = selection;
  return body;
}

export const importAiMonitorTraces: Command = {
  service: 'evaluation',
  command: '+import_ai_monitor_traces',
  description:
    'Create a dataset import job from AI Monitor traces via POST /agenteval/api/v1/datasets/ai-monitor-imports. Returns the created dataset and import job; the import is asynchronous, so poll +dataset_import_status with the returned dataset id instead of treating the 201 as completion.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Target dataset name (max 128 chars)' },
    { name: 'description', type: 'string', desc: 'Optional dataset description (max 2000 chars)' },
    {
      name: 'selection-json',
      type: 'json',
      required: true,
      sensitive: true,
      desc: 'Import selection JSON (redacted from logs): {"mode":"FILTER","start_time":"YYYY-MM-DD","end_time":"YYYY-MM-DD"} (dates required, optional agent, channel, search_term) or {"mode":"TRACE_IDS","trace_ids":["<id>"]} (1-1000 ids)',
    },
    {
      name: 'idempotency-key',
      type: 'string',
      desc: 'Optional Idempotency-Key header (max 191 chars) for duplicate-import protection',
    },
  ],
  risk: 'write',
  dryRun: (ctx) =>
    evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx), {
      idempotencyKey: ctx.str('idempotency-key') || undefined,
    }),
  execute: async (ctx) =>
    evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx), {
      idempotencyKey: ctx.str('idempotency-key') || undefined,
    }),
};
