import type { Command } from '../../../framework/types.js';

// integration commands
import { listDatasourceComponents } from './list-datasource-components.js';
import { listSpaceDatasources } from './list-space-datasources.js';
import { testDatasourceConnect } from './test-datasource-connect.js';
import { listDatasourceTables } from './list-datasource-tables.js';
import { getTableStructure } from './get-table-structure.js';
import { listSyncDatasources } from './list-sync-datasources.js';
import { listDatasourceDatabases } from './list-datasource-databases.js';
import { onlineDatasource } from './online-datasource.js';
import { addDatasource } from './add-datasource.js';
import { modifyDatasource } from './modify-datasource.js';
import { validateSql } from './validate-sql.js';
import { executeSql } from './execute-sql.js';
import { listSyncSolutions } from './list-sync-solutions.js';
import { getSyncDetail } from './get-sync-detail.js';
import { listSyncExecHistories } from './list-sync-exec-histories.js';
import { getSyncExecInfo } from './get-sync-exec-info.js';
import { execSyncSolution } from './exec-sync-solution.js';
import { addSyncSolution } from './add-sync-solution.js';
import { saveSyncSolution } from './save-sync-solution.js';
import { stopSyncSolution } from './stop-sync-solution.js';

const commands: Command[] = [
  listDatasourceComponents,
  listSpaceDatasources,
  testDatasourceConnect,
  listDatasourceTables,
  getTableStructure,
  listSyncDatasources,
  listDatasourceDatabases,
  onlineDatasource,
  addDatasource,
  modifyDatasource,
  validateSql,
  executeSql,
  listSyncSolutions,
  getSyncDetail,
  listSyncExecHistories,
  getSyncExecInfo,
  execSyncSolution,
  addSyncSolution,
  saveSyncSolution,
  stopSyncSolution,
];

export default commands;