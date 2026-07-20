import type { Command } from '../../../framework/types.js';
import { workbenchList } from './workbench/list.js';
import { workbenchAdd } from './workbench/add.js';
import { workbenchUpdate } from './workbench/update.js';
import { workbenchDelete } from './workbench/delete.js';

const commands: Command[] = [
  workbenchList,
  workbenchAdd,
  workbenchUpdate,
  workbenchDelete,
];

export { workbenchList } from './workbench/list.js';
export { workbenchAdd } from './workbench/add.js';
export { workbenchUpdate } from './workbench/update.js';
export { workbenchDelete } from './workbench/delete.js';

export default commands;
