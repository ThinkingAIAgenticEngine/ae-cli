import { resolveHost } from '../../core/auth.js';
import { getCliToken, clearCliToken } from '../../core/cli-token.js';
import { PermissionError } from '../../core/errors.js';
import { safeJsonParse } from '../../core/json-utils.js';
import { logger } from '../../core/logger.js';
import type { DryRunResult, RuntimeContext } from '../../framework/types.js';

type DataopsApiMethod = 'GET' | 'POST';

interface DataopsApiSpec {
  method: DataopsApiMethod;
  path: string;
}

const TOOL_API_MAP: Record<string, DataopsApiSpec> = {
  repo_list_spaces: { method: 'GET', path: '/api/cli/dataops/v1/gaia/repo/spaces' },

  datatable_get_table_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/datatable/table-detail' },
  datatable_dict_search_tables: { method: 'GET', path: '/api/cli/dataops/v1/gaia/datatable/dict-tables' },
  datatable_create_table: { method: 'POST', path: '/api/cli/dataops/v1/gaia/datatable/tables' },
  datatable_create_view: { method: 'POST', path: '/api/cli/dataops/v1/gaia/datatable/views' },
  datatable_publish_entity: { method: 'POST', path: '/api/cli/dataops/v1/gaia/datatable/publish' },

  flow_list_flows: { method: 'GET', path: '/api/cli/dataops/v1/gaia/workflow/flows' },
  flow_get_flow_overview: { method: 'GET', path: '/api/cli/dataops/v1/gaia/workflow/flow-overview' },
  flow_list_high_frequency_release_flows: { method: 'GET', path: '/api/cli/dataops/v1/gaia/workflow/flow-release/high-frequency' },
  flow_create_flow: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/flows' },
  flow_update_flow: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/flow-basic' },
  flow_save_schedule_config: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/schedule-config' },
  flow_execute_flow: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/flow-execution' },
  flow_preview_release_flow: { method: 'GET', path: '/api/cli/dataops/v1/gaia/workflow/flow-release/preview' },
  flow_release_flow: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/flow-release' },
  flow_create_sql_task: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/tasks' },
  flow_update_sql_task: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/sql-task-definition' },
  flow_create_integration_task: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/integration-tasks' },
  flow_update_integration_task: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/integration-task-definition' },
  flow_add_task_relation: { method: 'POST', path: '/api/cli/dataops/v1/gaia/workflow/task-relation' },
  flow_get_task_params: { method: 'GET', path: '/api/cli/dataops/v1/gaia/workflow/task-params' },

  operations_search_flow_instances: { method: 'POST', path: '/api/cli/dataops/v1/gaia/operations/flow-instances/search' },
  operations_get_flow_instance_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/operations/flow-instances/detail' },
  operations_get_task_instance_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/operations/task-instances/detail' },
  operations_stop_flow_instance: { method: 'POST', path: '/api/cli/dataops/v1/gaia/operations/flow-instances/stop' },

  integration_list_datasource_components: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasource-components' },
  integration_get_datasource_component_template: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasource-component-template' },
  integration_list_space_datasources: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasources' },
  integration_get_datasource_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasource-detail' },
  integration_test_datasource_connect: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/datasource-connect-test' },
  integration_list_datasource_databases: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasource-databases' },
  integration_list_datasource_tables: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/datasource-tables' },
  integration_get_table_structure: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/table-structure' },
  integration_list_sync_datasources: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/sync-datasources' },
  integration_add_datasource: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/datasources' },
  integration_modify_datasource: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/datasource-modification' },
  integration_online_datasource: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/datasource-online' },
  integration_list_sync_solutions: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/sync-solutions' },
  integration_get_sync_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/sync-detail' },
  integration_list_sync_runs: { method: 'GET', path: '/api/cli/dataops/v1/gaia/integration/sync-runs' },
  integration_add_sync_solution: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/sync-solutions' },
  integration_save_sync_solution: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/sync-solution-save' },
  integration_exec_sync_solution: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/sync-execution' },
  integration_stop_sync_solution: { method: 'POST', path: '/api/cli/dataops/v1/gaia/integration/sync-stop' },

  ide_list_repos: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/repos' },
  ide_list_catalogs: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/catalogs' },
  ide_list_tables: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/tables' },
  ide_search_tables: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/table-search' },
  ide_get_table_detail: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/table-detail' },
  ide_get_schema_info: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/schema-info' },
  ide_submit_sql_query: { method: 'POST', path: '/api/cli/dataops/v1/gaia/ide/sql-query-submit' },
  ide_get_sql_query_status: { method: 'GET', path: '/api/cli/dataops/v1/gaia/ide/sql-query-status' },
  ide_cancel_sql_query: { method: 'POST', path: '/api/cli/dataops/v1/gaia/ide/sql-query-cancel' },
};

export async function callDataopsApi(ctx: RuntimeContext, toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const spec = TOOL_API_MAP[toolName];
  if (!spec) {
    throw new Error(`DataOps API mapping not found for tool: ${toolName}`);
  }

  const params = compactArgs(args);
  if (spec.method === 'GET') {
    return dataopsRequest(ctx, spec.method, spec.path, params);
  }
  return dataopsRequest(ctx, spec.method, spec.path, {}, params);
}

export function buildDataopsApiDryRun(ctx: RuntimeContext, toolName: string, args: Record<string, unknown> = {}): DryRunResult {
  const spec = TOOL_API_MAP[toolName];
  if (!spec) {
    throw new Error(`DataOps API mapping not found for tool: ${toolName}`);
  }

  const params = compactArgs(args);
  if (spec.method === 'GET') {
    return {
      method: spec.method,
      url: buildUrl(resolveHost(ctx.host()), spec.path, params),
      params,
    };
  }

  return {
    method: spec.method,
    url: buildUrl(resolveHost(ctx.host()), spec.path),
    body: params,
  };
}

export async function downloadDataopsApi(
  ctx: RuntimeContext,
  path: string,
  params: Record<string, unknown>,
  retry = true,
): Promise<Buffer> {
  const host = resolveHost(ctx.host());
  const token = await getCliToken(host);
  const url = buildUrl(host, path, compactArgs(params));
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'cli-token': token,
      'Accept': '*/*',
      
    },
  });

  if (resp.status === 403) {
    const data = parseResponseBody(await resp.text(), url, resp.status, true);
    throw new PermissionError(permissionMessage(data));
  }
  if (resp.status === 401 && retry) {
    clearCliToken(host);
    return downloadDataopsApi(ctx, path, params, false);
  }
  if (!resp.ok) {
    const data = parseResponseBody(await resp.text(), url, resp.status, true);
    throw new Error(formatHttpError(resp.status, resp.statusText, data));
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function dataopsRequest(
  ctx: RuntimeContext,
  method: DataopsApiMethod,
  path: string,
  params: Record<string, unknown> = {},
  body?: Record<string, unknown>,
  retry = true
): Promise<unknown> {
  const host = resolveHost(ctx.host());
  const token = await getCliToken(host);
  const url = buildUrl(host, path, params);
  const headers: Record<string, string> = {
    'cli-token': token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    
  };
  const options: RequestInit = { method, headers };
  if (method !== 'GET') {
    options.body = JSON.stringify(body ?? {});
  }

  const resp = await fetch(url, options);
  const text = await resp.text();
  const data = parseResponseBody(text, url, resp.status, !resp.ok);
  logger.api(method, url, resp.status, body, data);

  if (resp.status === 403) {
    throw new PermissionError(permissionMessage(data));
  }

  if (resp.status === 401 && retry) {
    logger.warn(`DataOps request failed (HTTP 401) for ${host}, refreshing CLI token`);
    clearCliToken(host);
    return dataopsRequest(ctx, method, path, params, body, false);
  }

  if (!resp.ok) {
    throw new Error(formatHttpError(resp.status, resp.statusText, data));
  }

  return unwrapDataResponse(data);
}

function buildUrl(host: string, path: string, params: Record<string, unknown> = {}): string {
  const base = host.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function compactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    result[key] = value;
  }
  return result;
}

function unwrapDataResponse(data: any): unknown {
  const returnCode = data?.returnCode ?? data?.return_code;
  const returnMessage = data?.returnMessage ?? data?.return_message;
  if (returnCode !== undefined && returnCode !== 0) {
    throw new Error(`AE API error: ${returnMessage || 'unknown'} (code: ${returnCode})`);
  }
  if (data?.data !== undefined) {
    return data.data;
  }
  return data;
}

function parseResponseBody(text: string, url: string, status: number, allowPlainText = false): unknown {
  try {
    return safeJsonParse(text);
  } catch {
    if (allowPlainText) {
      return text;
    }
    const preview = text.trim().slice(0, 120);
    throw new Error(`AE API error: non-JSON response from ${url} (HTTP ${status}): ${preview || '<empty>'}`);
  }
}

function permissionMessage(data: any): string {
  const detail = data?.error?.message || data?.message || data?.error || data?.return_message || data?.returnMessage;
  if (detail && typeof detail === 'string') {
    return detail;
  }
  return 'Permission denied for this resource (HTTP 403)';
}

function formatHttpError(status: number, statusText: string, data: any): string {
  const detail = typeof data === 'string'
    ? data
    : data?.message || data?.error || data?.return_message || data?.returnMessage;
  const path = data?.path ? ` path: ${data.path}` : '';
  return `AE API error: HTTP ${status} ${statusText}${detail ? ` - ${detail}` : ''}${path}`;
}
