import type { Command, RuntimeContext } from '../../../framework/types.js';
import { CapabilityGatewayError } from '../../../core/capability-api.js';
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

export const sqlReportParamsDescription = 'SQL reports only. First run analysis report get for every target SQL report; each name must exist in every definition.params. For a selector parameter, put the exact UI option label from definition.params[].options[].name in the override value field; never send options[].value or its SQL fragment. Other parameter types use their documented value/range fields. Do not send definition fields such as paramType, selectorItems, options, or use_timezone.';

const SQL_SELECTOR_RUNTIME_ERROR_HINT = 'If --sql-params overrides a selector, run analysis report get and copy the exact definition.params[].options[].name label into the override value field. Do not pass options[].value or its underlying SQL fragment, and do not guess or automatically rewrite an ambiguous option.';

function enrichSqlSelectorRuntimeError(error: unknown): unknown {
  if (
    !(error instanceof CapabilityGatewayError)
    || error.code !== 'INVALID_REPORT_DEFINITION'
    || !/selectorName\s+invalid/i.test(error.message)
  ) {
    return error;
  }

  const hint = error.hint
    ? `${error.hint} ${SQL_SELECTOR_RUNTIME_ERROR_HINT}`
    : SQL_SELECTOR_RUNTIME_ERROR_HINT;
  return new CapabilityGatewayError(
    error.message,
    error.code,
    error.httpStatus,
    hint,
    error.meta,
  );
}

async function withSqlSelectorRuntimeErrorHint<T>(operation: () => T | Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw enrichSqlSelectorRuntimeError(error);
  }
}

/** Add an actionable diagnostic for the legacy SQL Selector error without another network call. */
export function withSqlSelectorRuntimeDiagnostics(command: Command): Command {
  const validateInput = command.validateInput;
  const dryRun = command.dryRun;
  const execute = command.execute;
  return {
    ...command,
    ...(validateInput
      ? { validateInput: (ctx: RuntimeContext) => withSqlSelectorRuntimeErrorHint(() => validateInput(ctx)) }
      : {}),
    ...(dryRun
      ? { dryRun: (ctx: RuntimeContext) => withSqlSelectorRuntimeErrorHint(() => dryRun(ctx)) }
      : {}),
    execute: (ctx: RuntimeContext) => withSqlSelectorRuntimeErrorHint(() => execute(ctx)),
  };
}

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
