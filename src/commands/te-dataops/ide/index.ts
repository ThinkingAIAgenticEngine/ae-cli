import type { Command } from '../../../framework/types.js';

// ide commands
import { cancelQuery } from './cancel-query.js';
import { getQueryProgress } from './get-query-progress.js';
import { executeSql } from './execute-sql.js';
import { listCatalogs } from './list-catalogs.js';
import { getSchemaInfo } from './get-schema-info.js';
import { searchColumns } from './search-columns.js';
import { getTableDetail } from './get-table-detail.js';
import { generateSql } from './generate-sql.js';
import { searchTables } from './search-tables.js';
import { listRepos } from './list-repos.js';
import { listTables } from './list-tables.js';
import { getQueryResult } from './get-query-result.js';

const commands: Command[] = [
  cancelQuery,
  getQueryProgress,
  executeSql,
  listCatalogs,
  getSchemaInfo,
  searchColumns,
  getTableDetail,
  generateSql,
  searchTables,
  listRepos,
  listTables,
  getQueryResult,
];

export default commands;