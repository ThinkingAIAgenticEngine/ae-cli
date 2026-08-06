import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  optionalJson,
  optionalNumber,
  optionalString,
} from '../capability-shared.js';

export const sourceFlag: Flag = {
  name: 'source',
  type: 'json',
  required: false,
  desc: 'Source selector copied from the compact sources[] summary when the synchronous preview contains multiple reports or charts. Pass exactly one returned field: report_id or chart_id.',
};

export const coordinateFlag: Flag = {
  name: 'coordinate',
  type: 'json',
  required: true,
  desc: 'One semantic cell coordinate assembled only from row_options, column_options, and metric_options returned by analysis query-context get. Never pass target_id, raw QP, or inferred values.',
};

export const propertiesFlag: Flag = {
  name: 'properties',
  type: 'json',
  required: false,
  desc: 'Optional property projection object array using exact columnName and named tableType values (event or user). Subject-specific support and mandatory identity columns are documented by each command; do not pass string-name arrays.',
};

export const useCacheFlag: Flag = {
  name: 'use-cache',
  type: 'boolean',
  required: false,
  desc: 'Whether to use query cache. Default: true.',
};

export function createResultClusterInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
    coordinate: ctx.json('coordinate'),
    cluster_name: ctx.str('cluster-name'),
    display_name: optionalString(ctx, 'display-name'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}
