import type { Command } from '../../framework/types.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import { bucketList } from './bucket/list.js';
import { experimentBatchDelete } from './experiment/batch-delete.js';
import { experimentConflictCheck } from './experiment/conflict-check.js';
import { experimentGet } from './experiment/get.js';
import { experimentList } from './experiment/list.js';
import { experimentListArchived } from './experiment/list-archived.js';
import { experimentManage } from './experiment/manage.js';
import { experimentReadyCheck } from './experiment/ready-check.js';
import { experimentSave } from './experiment/save.js';
import { experimentUpdateGroup } from './experiment/update-group.js';
import { experimentUpdateMetrics } from './experiment/update-metrics.js';
import { featureBatchDelete } from './feature/batch-delete.js';
import { featureGet } from './feature/get.js';
import { featureList } from './feature/list.js';
import { featureSave } from './feature/save.js';
import { featureUpdateStatus } from './feature/update-status.js';
import { featureVersionList } from './feature/version-list.js';
import { featureOperationLogQuery } from './feature/operation-log/query.js';
import { featureWhitelistBatchDelete } from './feature-whitelist/batch-delete.js';
import { featureWhitelistList } from './feature-whitelist/list.js';
import { featureWhitelistSave } from './feature-whitelist/save.js';
import { featureWhitelistUpdateStatus } from './feature-whitelist/update-status.js';
import { metricDelete } from './metric/delete.js';
import { metricGet } from './metric/get.js';
import { metricList } from './metric/list.js';
import { metricSave } from './metric/save.js';
import { operationLogQuery } from './operation-log/query.js';
import { saveBuildGuide } from './save/build-guide.js';
import { saveValidate } from './save/validate.js';
import { reportMetricTrend } from './report/metric-trend.js';
import { reportSampleSize } from './report/sample-size.js';
import { reportSummary } from './report/summary.js';
import { trafficLayerBatchDelete } from './traffic-layer/batch-delete.js';
import { trafficLayerGet } from './traffic-layer/get.js';
import { trafficLayerList } from './traffic-layer/list.js';
import { trafficLayerSave } from './traffic-layer/save.js';

registerCapabilityGatewayRoute('experiment', { gatewayDomain: 'engage' });

const commands: Command[] = [
  experimentSave,
  experimentList,
  experimentListArchived,
  experimentGet,
  experimentReadyCheck,
  experimentConflictCheck,
  experimentManage,
  experimentUpdateGroup,
  experimentUpdateMetrics,
  experimentBatchDelete,
  operationLogQuery,
  saveBuildGuide,
  saveValidate,
  trafficLayerSave,
  trafficLayerGet,
  trafficLayerList,
  trafficLayerBatchDelete,
  reportSummary,
  reportSampleSize,
  reportMetricTrend,
  metricSave,
  metricGet,
  metricList,
  metricDelete,
  featureSave,
  featureUpdateStatus,
  featureGet,
  featureList,
  featureVersionList,
  featureOperationLogQuery,
  featureBatchDelete,
  featureWhitelistList,
  featureWhitelistSave,
  featureWhitelistUpdateStatus,
  featureWhitelistBatchDelete,
  bucketList,
];

export {
  bucketList,
  experimentBatchDelete,
  experimentConflictCheck,
  experimentGet,
  experimentList,
  experimentListArchived,
  experimentManage,
  experimentReadyCheck,
  experimentSave,
  experimentUpdateGroup,
  experimentUpdateMetrics,
  featureBatchDelete,
  featureWhitelistBatchDelete,
  featureWhitelistList,
  featureWhitelistSave,
  featureWhitelistUpdateStatus,
  featureGet,
  featureList,
  featureSave,
  featureUpdateStatus,
  featureVersionList,
  featureOperationLogQuery,
  metricDelete,
  metricGet,
  metricList,
  metricSave,
  operationLogQuery,
  reportMetricTrend,
  reportSampleSize,
  reportSummary,
  saveBuildGuide,
  saveValidate,
  trafficLayerBatchDelete,
  trafficLayerGet,
  trafficLayerList,
  trafficLayerSave,
};

export default commands;
