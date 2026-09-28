import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  cacheConfigFlag,
  clearHistoryTagFlag,
  dashboardStatusFlag,
  nodeIdsFlag,
  refreshTypeFlag,
  reportsVersionFlag,
  scheduleUiConfigFlag,
  zoneOffsetFlag,
} from './shared.js';

export const analysisMetaAssetBatchSqlExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-sql-export',
  capabilityId: 'governance.asset.batch_export_sql',
  description: 'Batch export asset SQL definitions.',
  flags: [projectIdFlag, nodeIdsFlag, reportsVersionFlag, zoneOffsetFlag, scheduleUiConfigFlag, dashboardStatusFlag, refreshTypeFlag, cacheConfigFlag, clearHistoryTagFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","reports_version","zone_offset","schedule_ui_config","dashboard_status","refresh_type","cache_config","clear_history_tag"]),
});
