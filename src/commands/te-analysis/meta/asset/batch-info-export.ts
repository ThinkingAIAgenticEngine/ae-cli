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

export const analysisMetaAssetBatchInfoExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-info-export',
  capabilityId: 'governance.asset.batch_export_info',
  description: 'Batch export asset information.',
  flags: [projectIdFlag, nodeIdsFlag, reportsVersionFlag, zoneOffsetFlag, scheduleUiConfigFlag, dashboardStatusFlag, refreshTypeFlag, cacheConfigFlag, clearHistoryTagFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","reports_version","zone_offset","schedule_ui_config","dashboard_status","refresh_type","cache_config","clear_history_tag"]),
});
