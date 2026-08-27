import type { Command } from '../../../framework/types.js';
import { analysisMetaAssetUsageList } from '../meta/asset/usage-list.js';
import { analysisMetaAssetUsageExport } from '../meta/asset/usage-export.js';
import { analysisMetaAssetLineageGet } from '../meta/asset/lineage-get.js';
import { analysisMetaAssetDependencyList } from '../meta/asset/dependency-list.js';
import { analysisMetaAssetImpactList } from '../meta/asset/impact-list.js';
import { analysisMetaAssetQueryHistoryList } from '../meta/asset/query-history-list.js';
import { analysisMetaAssetRuleSchema } from '../meta/asset/rule-schema.js';
import { analysisMetaAssetRuleList } from '../meta/asset/rule-list.js';
import { analysisMetaAssetRuleCreate } from '../meta/asset/rule-create.js';
import { analysisMetaAssetRuleUpdate } from '../meta/asset/rule-update.js';
import { analysisMetaAssetRuleDelete } from '../meta/asset/rule-delete.js';
import { analysisMetaAssetBatchInfoExport } from '../meta/asset/batch-info-export.js';
import { analysisMetaAssetBatchSqlExport } from '../meta/asset/batch-sql-export.js';
import { analysisMetaAssetBatchDelete } from '../meta/asset/batch-delete.js';
import { analysisMetaAssetBatchDisableAutoUpdate } from '../meta/asset/batch-disable-auto-update.js';
import { analysisMetaAssetBatchDisableAutoBackup } from '../meta/asset/batch-disable-auto-backup.js';
import { analysisMetaAssetBatchDashboardScheduleFreeze } from '../meta/asset/batch-dashboard-schedule-freeze.js';
import { analysisMetaAssetBatchHandover } from '../meta/asset/batch-handover.js';
import { analysisMetaAssetOperationRecordList } from '../meta/asset/operation-record-list.js';
import { analysisMetaAssetOperationRecordExport } from '../meta/asset/operation-record-export.js';
import { analysisGovernanceAssetAuthenticationList } from './asset-authentication-list.js';
import { analysisGovernanceAssetAuthenticationExport } from './asset-authentication-export.js';
import { analysisGovernanceAssetAuthenticationUpdate } from './asset-authentication-update.js';

const commands: Command[] = [
  analysisGovernanceAssetAuthenticationList,
  analysisGovernanceAssetAuthenticationExport,
  analysisGovernanceAssetAuthenticationUpdate,
  analysisMetaAssetUsageList,
  analysisMetaAssetUsageExport,
  analysisMetaAssetBatchInfoExport,
  analysisMetaAssetBatchSqlExport,
  analysisMetaAssetBatchDelete,
  analysisMetaAssetBatchDisableAutoUpdate,
  analysisMetaAssetBatchDisableAutoBackup,
  analysisMetaAssetBatchDashboardScheduleFreeze,
  analysisMetaAssetBatchHandover,
  analysisMetaAssetLineageGet,
  analysisMetaAssetDependencyList,
  analysisMetaAssetImpactList,
  analysisMetaAssetQueryHistoryList,
  analysisMetaAssetRuleSchema,
  analysisMetaAssetRuleList,
  analysisMetaAssetRuleCreate,
  analysisMetaAssetRuleUpdate,
  analysisMetaAssetRuleDelete,
  analysisMetaAssetOperationRecordList,
  analysisMetaAssetOperationRecordExport,
];

export default commands;
