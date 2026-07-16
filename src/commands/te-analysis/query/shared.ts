import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  optionalNumber,
  optionalString,
} from '../capability-shared.js';

export const targetFlag: Flag = {
  name: 'target',
  type: 'json',
  required: true,
  desc: 'Use only when the upstream availability flag is true. Pass sources[].target_contract.default_target directly, or copy it and replace only named machine fields for a specific result; never infer from display text or raw QP.',
};

export const propertiesFlag: Flag = {
  name: 'properties',
  type: 'json',
  required: false,
  desc: 'Optional backend property request object array. Omit for defaults; do not pass string-name arrays.',
};

export const useCacheFlag: Flag = {
  name: 'use-cache',
  type: 'boolean',
  required: false,
  desc: 'Whether to use query cache. Default: true.',
};

export function createResultClusterInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    query_context_id: ctx.str('query-context-id'),
    target: ctx.json('target'),
    cluster_name: ctx.str('cluster-name'),
    display_name: optionalString(ctx, 'display-name'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}
