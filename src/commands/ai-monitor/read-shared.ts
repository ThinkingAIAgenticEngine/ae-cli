import type { Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { scopeValue } from './shared.js';

export type ReadField = Flag & {
  choices?: Array<string | number>;
  integer?: boolean;
  array?: boolean;
  minItems?: number;
  maxItems?: number;
  itemChoices?: string[];
  stringItems?: boolean;
};
export type ReadCommandSpec = {
  id: string;
  description: string;
  outputDescription: string;
  fields: ReadField[];
};

export const scopeFlags: Flag[] = [
  { name: 'platform', type: 'string', desc: 'Agent platform name or ID from platform list.', minLength: 1, maxLength: 255 },
  { name: 'environment', type: 'string', desc: 'Runtime environment name or ID from platform list.', minLength: 1, maxLength: 255 },
  { name: 'data-token', type: 'string', desc: 'Advanced compatibility platform key; default AE-AGENT.', minLength: 1, maxLength: 255 },
  { name: 'report-source', type: 'string', desc: 'Advanced compatibility runtime key; default __default__.', minLength: 1, maxLength: 255 },
];

export function buildScopeInput(ctx: RuntimeContext) {
  return {
    data_token: scopeValue(ctx, 'platform', 'data-token', 'AE-AGENT'),
    report_source: scopeValue(ctx, 'environment', 'report-source', '__default__'),
  };
}

function invalid(name: string, message: string): never {
  throw new CliValidationError(`--${name} ${message}`, { code: 'INVALID_AI_MONITOR_INPUT' });
}

/** Validate local typed flags without echoing business data; the gateway validates the full schema. */
export function readFields(ctx: RuntimeContext, fields: ReadField[]): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    if (!ctx.has?.(field.name) && field.default === undefined && !field.required) continue;
    const value = !ctx.has?.(field.name) && field.default !== undefined ? field.default
      : field.type === 'json' ? ctx.json(field.name)
      : field.type === 'number' ? ctx.num(field.name)
      : field.type === 'boolean' ? ctx.bool(field.name)
      : ctx.str(field.name).trim();
    if (field.choices && !field.choices.includes(value as string | number)) invalid(field.name, `must be one of: ${field.choices.join(', ')}.`);
    if (field.integer && !Number.isSafeInteger(value)) invalid(field.name, 'must be a safe integer.');
    if (field.array) {
      if (!Array.isArray(value)) invalid(field.name, 'must be a JSON array.');
      if (field.minItems !== undefined && value.length < field.minItems) invalid(field.name, `must contain at least ${field.minItems} items.`);
      if (field.maxItems !== undefined && value.length > field.maxItems) invalid(field.name, `must contain at most ${field.maxItems} items.`);
      if (field.stringItems && value.some(item => typeof item !== 'string' || !item.trim())) invalid(field.name, 'must contain nonempty strings.');
      if (field.itemChoices && value.some(item => !field.itemChoices!.includes(item))) invalid(field.name, 'contains an unsupported value.');
    }
    input[field.name.replace(/-/g, '_')] = value;
  }
  return input;
}

export function buildReadInput(ctx: RuntimeContext, spec: ReadCommandSpec): Record<string, unknown> {
  const input: Record<string, unknown> = { ...buildScopeInput(ctx), ...readFields(ctx, spec.fields) };
  for (const [start, end] of [
    ['start_date', 'end_date'], ['period_start', 'period_end'],
    ['before_last_seen_at', 'before_issue_id'], ['before_occurred_at', 'before_finding_id'],
    ['before_created_at', 'before_task_id'],
  ]) {
    if ((input[start] === undefined) !== (input[end] === undefined)) invalid(start.replace(/_/g, '-'), `and --${end.replace(/_/g, '-')} must be provided together.`);
    if (start.endsWith('date') || start === 'period_start') {
      if (input[start] && input[end] && String(input[start]) > String(input[end])) invalid(start.replace(/_/g, '-'), 'must not be later than the end date.');
    }
  }
  if (spec.id === 'ai_monitor.diagnosis.list' && Boolean(input.entity_type) !== Boolean(input.entity_key)) invalid('entity-type', 'and --entity-key must be provided together.');
  if (spec.id === 'ai_monitor.diagnosis.report' && input.entity_type !== 'global' && !input.entity_key) invalid('entity-key', 'is required for non-global reports.');
  if (spec.id === 'ai_monitor.security.task_findings' && input.after_ordinal !== undefined && input.trace_id !== undefined) invalid('after-ordinal', 'cannot be combined with --trace-id.');
  return input;
}
