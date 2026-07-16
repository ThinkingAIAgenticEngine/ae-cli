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
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function reportDataExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...reportDataInput(ctx),
    limit: undefined,
    ...exportLifecycleInput(ctx),
  });
}
