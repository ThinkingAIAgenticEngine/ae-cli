import type { Command } from '../../../framework/types.js';

// datatable commands
import { getTableDetail } from './get-table-detail.js';
import { dictSearchTables } from './dict-search-tables.js';
import { createTable } from './create-table.js';
import { createView } from './create-view.js';
import { publishEntity } from './publish-entity.js';
import { addTableField } from './add-table-field.js';
import { modifyTableField } from './modify-table-field.js';
import { deleteTableField } from './delete-table-field.js';
import { recycleEntity } from './recycle-entity.js';
import { listRecycleBin } from './list-recycle-bin.js';
import { deleteRecycledEntity } from './delete-recycled-entity.js';

const commands: Command[] = [
  getTableDetail,
  dictSearchTables,
  createTable,
  createView,
  publishEntity,
  addTableField,
  modifyTableField,
  deleteTableField,
  recycleEntity,
  listRecycleBin,
  deleteRecycledEntity,
];

export { addTableField, modifyTableField, deleteTableField, recycleEntity, listRecycleBin, deleteRecycledEntity };
export default commands;
