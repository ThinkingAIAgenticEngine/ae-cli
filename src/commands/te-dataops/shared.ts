import { clearToken, getToken, resolveHost } from '../../core/auth.js';
import { safeJsonParse } from '../../core/json-utils.js';
import { logger } from '../../core/logger.js';
import type { DryRunResult, RuntimeContext } from '../../framework/types.js';

type DataopsApiMethod = 'GET' | 'POST';

interface DataopsApiSpec {
  method: DataopsApiMethod;
  path: string;
}

const TOOL_API_MAP: Record<string, DataopsApiSpec> = {
  repo_list_spaces: { method: 'GET', path: '/v1/gaia/mcp/api/repo/spaces' },

  datatable_get_table_detail: { method: 'GET', path: '/v1/gaia/mcp/api/datatable/table-detail' },
  datatable_dict_search_tables: { method: 'GET', path: '/v1/gaia/mcp/api/datatable/dict-tables' },
  datatable_create_table: { method: 'POST', path: '/v1/gaia/mcp/api/datatable/tables' },
  datatable_create_view: { method: 'POST', path: '/v1/gaia/mcp/api/datatable/views' },
  datatable_publish_entity: { method: 'POST', path: '/v1/gaia/mcp/api/datatable/publish' },

  flow_list_flows: { method: 'GET', path: '/v1/gaia/mcp/api/workflow/flows' },
  flow_get_flow_overview: { method: 'GET', path: '/v1/gaia/mcp/api/workflow/flow-overview' },
  flow_list_high_frequency_release_flows: { method: 'GET', path: '/v1/gaia/mcp/api/workflow/flow-release/high-frequency' },
  flow_create_flow: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/flows' },
  flow_update_flow: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/flow-basic' },
  flow_save_schedule_config: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/schedule-config' },
  flow_execute_flow: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/flow-execution' },
  flow_preview_release_flow: { method: 'GET', path: '/v1/gaia/mcp/api/workflow/flow-release/preview' },
  flow_release_flow: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/flow-release' },
  flow_create_sql_task: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/tasks' },
  flow_update_sql_task: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/sql-task-definition' },
  flow_create_integration_task: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/integration-tasks' },
  flow_update_integration_task: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/integration-task-definition' },
  flow_add_task_relation: { method: 'POST', path: '/v1/gaia/mcp/api/workflow/task-relation' },
  flow_get_task_params: { method: 'GET', path: '/v1/gaia/mcp/api/workflow/task-params' },

  operations_search_flow_instances: { method: 'POST', path: '/v1/gaia/mcp/api/operations/flow-instances/search' },
  operations_get_flow_instance_detail: { method: 'GET', path: '/v1/gaia/mcp/api/operations/flow-instances/detail' },
  operations_get_task_instance_detail: { method: 'GET', path: '/v1/gaia/mcp/api/operations/task-instances/detail' },
  operations_stop_flow_instance: { method: 'POST', path: '/v1/gaia/mcp/api/operations/flow-instances/stop' },

  integration_list_datasource_components: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasource-components' },
  integration_get_datasource_component_template: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasource-component-template' },
  integration_list_space_datasources: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasources' },
  integration_get_datasource_detail: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasource-detail' },
  integration_test_datasource_connect: { method: 'POST', path: '/v1/gaia/mcp/api/integration/datasource-connect-test' },
  integration_list_datasource_databases: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasource-databases' },
  integration_list_datasource_tables: { method: 'GET', path: '/v1/gaia/mcp/api/integration/datasource-tables' },
  integration_get_table_structure: { method: 'GET', path: '/v1/gaia/mcp/api/integration/table-structure' },
  integration_list_sync_datasources: { method: 'GET', path: '/v1/gaia/mcp/api/integration/sync-datasources' },
  integration_add_datasource: { method: 'POST', path: '/v1/gaia/mcp/api/integration/datasources' },
  integration_modify_datasource: { method: 'POST', path: '/v1/gaia/mcp/api/integration/datasource-modification' },
  integration_online_datasource: { method: 'POST', path: '/v1/gaia/mcp/api/integration/datasource-online' },
  integration_list_sync_solutions: { method: 'GET', path: '/v1/gaia/mcp/api/integration/sync-solutions' },
  integration_get_sync_detail: { method: 'GET', path: '/v1/gaia/mcp/api/integration/sync-detail' },
  integration_list_sync_runs: { method: 'GET', path: '/v1/gaia/mcp/api/integration/sync-runs' },
  integration_add_sync_solution: { method: 'POST', path: '/v1/gaia/mcp/api/integration/sync-solutions' },
  integration_save_sync_solution: { method: 'POST', path: '/v1/gaia/mcp/api/integration/sync-solution-save' },
  integration_exec_sync_solution: { method: 'POST', path: '/v1/gaia/mcp/api/integration/sync-execution' },
  integration_stop_sync_solution: { method: 'POST', path: '/v1/gaia/mcp/api/integration/sync-stop' },

  ide_list_repos: { method: 'GET', path: '/v1/gaia/mcp/api/ide/repos' },
  ide_list_catalogs: { method: 'GET', path: '/v1/gaia/mcp/api/ide/catalogs' },
  ide_list_tables: { method: 'GET', path: '/v1/gaia/mcp/api/ide/tables' },
  ide_search_tables: { method: 'GET', path: '/v1/gaia/mcp/api/ide/table-search' },
  ide_get_table_detail: { method: 'GET', path: '/v1/gaia/mcp/api/ide/table-detail' },
  ide_get_schema_info: { method: 'GET', path: '/v1/gaia/mcp/api/ide/schema-info' },
  ide_submit_sql_query: { method: 'POST', path: '/v1/gaia/mcp/api/ide/sql-query-submit' },
  ide_get_sql_query_status: { method: 'GET', path: '/v1/gaia/mcp/api/ide/sql-query-status' },
  ide_cancel_sql_query: { method: 'POST', path: '/v1/gaia/mcp/api/ide/sql-query-cancel' },
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

async function dataopsRequest(
  ctx: RuntimeContext,
  method: DataopsApiMethod,
  path: string,
  params: Record<string, unknown> = {},
  body?: Record<string, unknown>,
  retry = true
): Promise<unknown> {
  const host = resolveHost(ctx.host());
  const token = await getToken(host);
  const url = buildUrl(host, path, params);
  const headers: Record<string, string> = {
    Authorization: `bearer ${token}`,
    'Content-Type': 'application/json',
    
  };
  const options: RequestInit = { method, headers };
  if (method !== 'GET') {
    options.body = JSON.stringify(body ?? {});
  }

  const resp = await fetch(url, options);
  const text = await resp.text();
  const data = parseResponseBody(text, url, resp.status);
  logger.api(method, url, resp.status, body, data);

  if ((resp.status === 401 || resp.status === 403) && retry) {
    clearToken(host);
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

function parseResponseBody(text: string, url: string, status: number): unknown {
  try {
    return safeJsonParse(text);
  } catch {
    const preview = text.trim().slice(0, 120);
    throw new Error(`AE API error: non-JSON response from ${url} (HTTP ${status}): ${preview || '<empty>'}`);
  }
}

function formatHttpError(status: number, statusText: string, data: any): string {
  const detail = data?.message || data?.error || data?.return_message || data?.returnMessage;
  const path = data?.path ? ` path: ${data.path}` : '';
  return `AE API error: HTTP ${status} ${statusText}${detail ? ` - ${detail}` : ''}${path}`;
}
