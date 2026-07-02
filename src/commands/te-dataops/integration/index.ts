import type { Command } from '../../../framework/types.js';

// integration commands
import { listDatasourceComponents } from './list-datasource-components.js';
import { getDatasourceComponentTemplate } from './get-datasource-component-template.js';
import { listSpaceDatasources } from './list-space-datasources.js';
import { getDatasourceDetail } from './get-datasource-detail.js';
import { testDatasourceConnect } from './test-datasource-connect.js';
import { listDatasourceTables } from './list-datasource-tables.js';
import { getTableStructure } from './get-table-structure.js';
import { listSyncDatasources } from './list-sync-datasources.js';
import { listDatasourceDatabases } from './list-datasource-databases.js';
import { onlineDatasource } from './online-datasource.js';
import { addDatasource } from './add-datasource.js';
import { modifyDatasource } from './modify-datasource.js';
import { listSyncSolutions } from './list-sync-solutions.js';
import { getSyncDetail } from './get-sync-detail.js';
import { listSyncRuns } from './list-sync-runs.js';
import { execSyncSolution } from './exec-sync-solution.js';
import { addSyncSolution } from './add-sync-solution.js';
import { saveSyncSolution } from './save-sync-solution.js';
import { stopSyncSolution } from './stop-sync-solution.js';

const commands: Command[] = [
  listDatasourceComponents,
  getDatasourceComponentTemplate,
  listSpaceDatasources,
  getDatasourceDetail,
  testDatasourceConnect,
  listDatasourceTables,
  getTableStructure,
  listSyncDatasources,
  listDatasourceDatabases,
  onlineDatasource,
  addDatasource,
  modifyDatasource,
  listSyncSolutions,
  getSyncDetail,
  listSyncRuns,
  execSyncSolution,
  addSyncSolution,
  saveSyncSolution,
  stopSyncSolution,
];

export default commands;
