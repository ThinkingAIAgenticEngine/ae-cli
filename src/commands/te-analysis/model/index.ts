import type { Command } from '../../../framework/types.js';
import { queryAdhoc } from './query-adhoc.js';
import { cancelQuery } from './cancel-query.js';
import { buildEventAnalysisQp } from './build-event-analysis-qp.js';
import { buildRetentionAnalysisQp } from './build-retention-analysis-qp.js';
import { buildFunnelAnalysisQp } from './build-funnel-analysis-qp.js';
import { buildPropAnalysisQp } from './build-prop-analysis-qp.js';
import { drilldownUsers } from './drilldown-users.js';
import { drilldownUserEvents } from './drilldown-user-events.js';
import { createResultCluster } from './create-result-cluster.js';
import { loadFilters } from './load-filters.js';
import { getTableColumns } from './get-table-columns.js';
import { buildIntervalAnalysisQp } from './build-interval-analysis-qp.js';
import { buildPathAnalysisQp } from './build-path-analysis-qp.js';
import { buildAttributionAnalysisQp } from './build-attribution-analysis-qp.js';
import { buildHeatMapAnalysisQp } from './build-heat-map-analysis-qp.js';
import { buildRankListAnalysisQp } from './build-rank-list-analysis-qp.js';
import { buildDistributionAnalysisQp } from './build-distribution-analysis-qp.js';

const commands: Command[] = [
  buildEventAnalysisQp,
  buildRetentionAnalysisQp,
  buildFunnelAnalysisQp,
  buildPropAnalysisQp,
  buildIntervalAnalysisQp,
  buildPathAnalysisQp,
  buildAttributionAnalysisQp,
  buildHeatMapAnalysisQp,
  buildRankListAnalysisQp,
  buildDistributionAnalysisQp,
  queryAdhoc,
  cancelQuery,
  drilldownUsers,
  drilldownUserEvents,
  createResultCluster,
  loadFilters,
  getTableColumns,
];

export default commands;
