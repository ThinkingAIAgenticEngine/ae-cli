import type { Flag, RuntimeContext } from '../../../../framework/types.js';
import {
  compactInput,
  optionalJson,
  optionalJsonArray,
  optionalNumber,
  optionalString,
  projectInput,
} from '../../capability-shared.js';

export const nodeIdFlag: Flag = { name: 'node-id', type: 'string', required: false, desc: 'Poseidon asset node ID.' };
export const resourceIdFlag: Flag = { name: 'resource-id', type: 'string', required: false, desc: 'Asset business resource ID.' };
export const resourceTypeFlag: Flag = { name: 'resource-type', type: 'string', required: false, desc: 'Asset resource type.' };
export const linkInfoFlag: Flag = { name: 'link-info', type: 'json', required: false, desc: 'Asset link_info JSON.' };
export const searchsFlag: Flag = { name: 'searchs', type: 'json', required: false, desc: 'Quick filter JSON array.' };
export const ruleFlag: Flag = { name: 'rule', type: 'json', required: false, desc: 'Governance Filter JSON object.' };
export const operationTypeFlag: Flag = { name: 'operation-type', type: 'string', required: false, desc: 'Batch operation type.' };
export const ruleIdFlag: Flag = { name: 'rule-id', type: 'number', required: false, desc: 'Governance rule ID.' };
export const ruleNameFlag: Flag = { name: 'rule-name', type: 'string', required: false, desc: 'Governance rule name.' };
export const commentFlag: Flag = { name: 'comment', type: 'string', required: false, desc: 'Governance rule comment.' };
export const nodeIdsFlag: Flag = { name: 'node-ids', type: 'json', required: false, desc: 'Asset node ID JSON array.' };
export const reportsVersionFlag: Flag = { name: 'reports-version', type: 'number', required: false, desc: 'Dashboard reports version.' };
export const zoneOffsetFlag: Flag = { name: 'zone-offset', type: 'number', required: false, desc: 'Dashboard zone offset.' };
export const scheduleUiConfigFlag: Flag = { name: 'schedule-ui-config', type: 'json', required: false, desc: 'Dashboard schedule UI config JSON.' };
export const dashboardStatusFlag: Flag = { name: 'dashboard-status', type: 'string', required: false, desc: 'Dashboard status.' };
export const refreshTypeFlag: Flag = { name: 'refresh-type', type: 'number', required: false, desc: 'Dashboard refresh type: 1 enabled, 0 disabled.' };
export const cacheConfigFlag: Flag = { name: 'cache-config', type: 'json', required: false, desc: 'Dashboard cache config JSON.' };
export const toUserIdFlag: Flag = { name: 'to-user-id', type: 'number', required: true, desc: 'Target user ID for handover.' };
export const clearHistoryTagFlag: Flag = { name: 'clear-history-tag', type: 'number', required: false, desc: 'Whether to clear tag history: 1 yes, 0 no.' };
export const typeFlag: Flag = { name: 'type', type: 'string', required: false, desc: 'Batch operation type.' };
export const statusFlag: Flag = { name: 'status', type: 'json', required: false, desc: 'Operation status JSON array.' };
export const sortFieldFlag: Flag = { name: 'sort-field', type: 'string', required: false, desc: 'Sort field.' };
export const sortOrderFlag: Flag = { name: 'sort-order', type: 'string', required: false, desc: 'Sort order: asc or desc.' };
export const recordIdFlag: Flag = { name: 'record-id', type: 'number', required: false, desc: 'Operation record ID.' };

const readers: Record<string, (ctx: RuntimeContext) => unknown> = {
  node_id: (ctx) => optionalString(ctx, 'node-id'),
  resource_id: (ctx) => optionalString(ctx, 'resource-id'),
  resource_type: (ctx) => optionalString(ctx, 'resource-type'),
  link_info: (ctx) => optionalJson(ctx, 'link-info'),
  query: (ctx) => optionalString(ctx, 'query'),
  searchs: (ctx) => optionalJson(ctx, 'searchs'),
  rule: (ctx) => optionalJson(ctx, 'rule'),
  operation_type: (ctx) => optionalString(ctx, 'operation-type'),
  rule_id: (ctx) => optionalNumber(ctx, 'rule-id'),
  rule_name: (ctx) => optionalString(ctx, 'rule-name'),
  comment: (ctx) => optionalString(ctx, 'comment'),
  node_ids: (ctx) => optionalJsonArray(ctx, 'node-ids'),
  reports_version: (ctx) => optionalNumber(ctx, 'reports-version'),
  zone_offset: (ctx) => optionalNumber(ctx, 'zone-offset'),
  schedule_ui_config: (ctx) => optionalJson(ctx, 'schedule-ui-config'),
  dashboard_status: (ctx) => optionalString(ctx, 'dashboard-status'),
  refresh_type: (ctx) => optionalNumber(ctx, 'refresh-type'),
  cache_config: (ctx) => optionalJson(ctx, 'cache-config'),
  to_user_id: (ctx) => optionalNumber(ctx, 'to-user-id'),
  clear_history_tag: (ctx) => optionalNumber(ctx, 'clear-history-tag'),
  type: (ctx) => optionalString(ctx, 'type'),
  status: (ctx) => optionalJson(ctx, 'status'),
  sort_field: (ctx) => optionalString(ctx, 'sort-field'),
  sort_order: (ctx) => optionalString(ctx, 'sort-order'),
  record_id: (ctx) => optionalNumber(ctx, 'record-id'),
  limit: (ctx) => optionalNumber(ctx, 'limit'),
  offset: (ctx) => optionalNumber(ctx, 'offset'),
};

export function assetGovernanceInput(ctx: RuntimeContext, fields: string[]): Record<string, unknown> {
  const input: Record<string, unknown> = {
    ...projectInput(ctx),
    payload: optionalJson(ctx, 'payload'),
  };
  for (const field of fields) {
    input[field] = readers[field]?.(ctx);
  }
  return compactInput(input);
}
