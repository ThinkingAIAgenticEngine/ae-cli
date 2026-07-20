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
  desc: 'Source selector copied from sources[] when the synchronous preview contains multiple reports or charts. Pass only returned selector fields such as report_id or chart_id.',
};

export const coordinateFlag: Flag = {
  name: 'coordinate',
  type: 'json',
  required: true,
  desc: 'One semantic cell coordinate assembled only from the selected source.drilldown row_options, column_options, and metric_options. Never pass target_id, raw QP, or values absent from the synchronous preview.',
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
