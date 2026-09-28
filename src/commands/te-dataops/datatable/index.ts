import type { Command } from '../../../framework/types.js';

// datatable commands
import { getTableDetail } from './get-table-detail.js';
import { dictSearchTables } from './dict-search-tables.js';
import { createTable } from './create-table.js';
import { createView } from './create-view.js';
import { publishEntity } from './publish-entity.js';

const commands: Command[] = [
  getTableDetail,
  dictSearchTables,
  createTable,
  createView,
  publishEntity,
];

export default commands;
