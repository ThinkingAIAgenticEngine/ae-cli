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
import { featureBatchDelete } from './feature/batch-delete.js';
import { featureGet } from './feature/get.js';
import { featureList } from './feature/list.js';
import { featureSave } from './feature/save.js';
import { featureUpdateStatus } from './feature/update-status.js';
import { featureVersionList } from './feature/version-list.js';
import { featureOperationLogQuery } from './feature/operation-log/query.js';
import { metricDelete } from './metric/delete.js';
import { metricGet } from './metric/get.js';
import { metricList } from './metric/list.js';
import { metricSave } from './metric/save.js';
import { operationLogQuery } from './operation-log/query.js';
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
  experimentBatchDelete,
  operationLogQuery,
  trafficLayerSave,
  trafficLayerGet,
  trafficLayerList,
  trafficLayerBatchDelete,
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
  featureBatchDelete,
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
  trafficLayerBatchDelete,
  trafficLayerGet,
  trafficLayerList,
  trafficLayerSave,
};

export default commands;
