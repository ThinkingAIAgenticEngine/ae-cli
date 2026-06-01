import type { Command } from '../../../framework/types.js';
import { queryAdhoc } from './query-adhoc.js';
import { buildEventAnalysisQp } from './build-event-analysis-qp.js';
import { buildRetentionAnalysisQp } from './build-retention-analysis-qp.js';
import { buildFunnelAnalysisQp } from './build-funnel-analysis-qp.js';
import { buildPropAnalysisQp } from './build-prop-analysis-qp.js';
import { drilldownUsers } from './drilldown-users.js';
import { drilldownUserEvents } from './drilldown-user-events.js';
import { createResultCluster } from './create-result-cluster.js';
import { loadFilters } from './load-filters.js';
import { getTableColumns } from './get-table-columns.js';

const commands: Command[] = [
  buildEventAnalysisQp,
  buildRetentionAnalysisQp,
  buildFunnelAnalysisQp,
  buildPropAnalysisQp,
  queryAdhoc,
  drilldownUsers,
  drilldownUserEvents,
  createResultCluster,
  loadFilters,
  getTableColumns,
];

export default commands;
