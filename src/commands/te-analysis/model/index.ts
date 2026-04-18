import type { Command } from '../../../framework/types.js';
import { queryAdhoc } from './query-adhoc.js';
import { drilldownUsers } from './drilldown-users.js';
import { drilldownUserEvents } from './drilldown-user-events.js';
import { createResultCluster } from './create-result-cluster.js';
import { loadFilters } from './load-filters.js';
import { getTableColumns } from './get-table-columns.js';

const commands: Command[] = [
  queryAdhoc,
  drilldownUsers,
  drilldownUserEvents,
  createResultCluster,
  loadFilters,
  getTableColumns,
];

export default commands;
