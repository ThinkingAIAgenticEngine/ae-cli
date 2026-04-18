import type { Command } from '../../../framework/types.js';

// datatable commands
import { listTablesByPage } from './list-tables-by-page.js';
import { structByRepo } from './struct-by-repo.js';
import { getTableDetail } from './get-table-detail.js';
import { dictSearchTables } from './dict-search-tables.js';
import { listSystemTables } from './list-system-tables.js';
import { createTable } from './create-table.js';
import { createView } from './create-view.js';
import { getBatchStatus } from './get-batch-status.js';
import { listBatches } from './list-batches.js';
import { listSourceTables } from './list-source-tables.js';
import { batchCreate } from './batch-create.js';

const commands: Command[] = [
  listTablesByPage,
  structByRepo,
  getTableDetail,
  dictSearchTables,
  listSystemTables,
  createTable,
  createView,
  getBatchStatus,
  listBatches,
  listSourceTables,
  batchCreate,
];

export default commands;