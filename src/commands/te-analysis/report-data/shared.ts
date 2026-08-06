import type { RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  exportLifecycleInput,
  jsonArray,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectInput,
} from '../capability-shared.js';

export const reportDataZoneOffsetDescription = 'Query execution timezone. Omit it to match the report UI for the current user (user selection when available, otherwise project default). Use a fixed UTC offset from -12 through 14, or 99 for local-time mode with no conversion to one fixed UTC offset; 99 is not UTC+99. This is not persisted in the report definition.';

export function reportDataInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    report_ids: jsonArray(ctx, 'report-ids'),
    request_id: optionalString(ctx, 'request-id'),
    filters: optionalJson(ctx, 'filters'),
    group_by: optionalJson(ctx, 'group-by'),
    sql_params: optionalJson(ctx, 'sql-params'),
    start_time: optionalString(ctx, 'start-time'),
    end_time: optionalString(ctx, 'end-time'),
    time_granularity: optionalString(ctx, 'time-granularity'),
    cluster_query_scope: optionalString(ctx, 'cluster-query-scope'),
    slave_cluster_id: optionalString(ctx, 'slave-cluster-id'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function reportDataExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...reportDataInput(ctx),
    ...exportLifecycleInput(ctx),
  });
}
