import type { Command } from '../../framework/types.js';
import { registerMcpMappings } from '../../core/mcp.js';
import { batchDeleteExperiment } from './batch-delete-experiment.js';
import { batchDeleteFeature } from './batch-delete-feature.js';
import { batchDeleteTrafficLayer } from './batch-delete-traffic-layer.js';
import { cancelExperimentQueryByRequestId } from './cancel-experiment-query-by-request-id.js';
import { checkExperimentReady } from './check-experiment-ready.js';
import { deleteMetric } from './delete-metric.js';
import { manageExperiment } from './manage-experiment.js';
import { manageFeatureStatus } from './manage-feature-status.js';
import { queryBucketList } from './query-bucket-list.js';
import { queryExperimentDetail } from './query-experiment-detail.js';
import { queryExperimentList } from './query-experiment-list.js';
import { queryExperimentMetricTrend } from './query-experiment-metric-trend.js';
import { queryExperimentReportSummary } from './query-experiment-report-summary.js';
import { queryExperimentSampleSizeReport } from './query-experiment-sample-size-report.js';
import { queryFeatureDetail } from './query-feature-detail.js';
import { queryFeatureList } from './query-feature-list.js';
import { queryMetricDetail } from './query-metric-detail.js';
import { queryMetricList } from './query-metric-list.js';
import { queryTrafficLayerDetail } from './query-traffic-layer-detail.js';
import { queryTrafficLayerList } from './query-traffic-layer-list.js';
import { saveExperiment } from './save-experiment.js';
import { saveFeature } from './save-feature.js';
import { saveMetric } from './save-metric.js';
import { saveSubmitExperiment } from './save-submit-experiment.js';
import { saveTrafficLayer } from './save-traffic-layer.js';

registerMcpMappings({
  'experiment': { componentName: 'engage', mappingPath: 'experiment' },
});

const commands: Command[] = [
  saveExperiment,
  saveSubmitExperiment,
  queryExperimentList,
  queryExperimentDetail,
  checkExperimentReady,
  manageExperiment,
  batchDeleteExperiment,
  saveTrafficLayer,
  queryTrafficLayerDetail,
  queryTrafficLayerList,
  batchDeleteTrafficLayer,
  queryExperimentReportSummary,
  queryExperimentSampleSizeReport,
  queryExperimentMetricTrend,
  cancelExperimentQueryByRequestId,
  saveMetric,
  queryMetricDetail,
  queryMetricList,
  deleteMetric,
  saveFeature,
  manageFeatureStatus,
  queryFeatureDetail,
  queryFeatureList,
  batchDeleteFeature,
  queryBucketList,
];

export {
  batchDeleteExperiment,
  batchDeleteFeature,
  batchDeleteTrafficLayer,
  cancelExperimentQueryByRequestId,
  checkExperimentReady,
  deleteMetric,
  manageExperiment,
  manageFeatureStatus,
  queryBucketList,
  queryExperimentDetail,
  queryExperimentList,
  queryExperimentMetricTrend,
  queryExperimentReportSummary,
  queryExperimentSampleSizeReport,
  queryFeatureDetail,
  queryFeatureList,
  queryMetricDetail,
  queryMetricList,
  queryTrafficLayerDetail,
  queryTrafficLayerList,
  saveExperiment,
  saveFeature,
  saveMetric,
  saveSubmitExperiment,
  saveTrafficLayer,
};

export default commands;
