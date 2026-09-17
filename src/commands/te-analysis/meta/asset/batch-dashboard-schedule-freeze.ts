import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  cacheConfigFlag,
  dashboardStatusFlag,
  nodeIdsFlag,
  refreshTypeFlag,
  scheduleUiConfigFlag,
} from './shared.js';

export const analysisMetaAssetBatchDashboardScheduleFreeze = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-dashboard-schedule-freeze',
  capabilityId: 'governance.asset.batch_dashboard_schedule_freeze',
  description: 'Batch freeze dashboard schedules for governed assets.',
  flags: [projectIdFlag, nodeIdsFlag, scheduleUiConfigFlag, dashboardStatusFlag, refreshTypeFlag, cacheConfigFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","schedule_ui_config","dashboard_status","refresh_type","cache_config"]),
});
