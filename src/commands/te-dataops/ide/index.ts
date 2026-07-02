import type { Command } from '../../../framework/types.js';

// ide commands
import { cancelSqlQuery } from './cancel-sql-query.js';
import { getSqlQueryStatus } from './get-sql-query-status.js';
import { listCatalogs } from './list-catalogs.js';
import { getSchemaInfo } from './get-schema-info.js';
import { getTableDetail } from './get-table-detail.js';
import { searchTables } from './search-tables.js';
import { listRepos } from './list-repos.js';
import { listTables } from './list-tables.js';
import { submitSqlQuery } from './submit-sql-query.js';

const commands: Command[] = [
  cancelSqlQuery,
  getSqlQueryStatus,
  submitSqlQuery,
  listCatalogs,
  getSchemaInfo,
  getTableDetail,
  searchTables,
  listRepos,
  listTables,
];

export default commands;
