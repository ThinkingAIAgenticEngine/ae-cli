import type { Command } from '../../../framework/types.js';
import { reportList } from './list.js';
import { reportListExport } from './list-export.js';
import { reportGet } from './get.js';
import { reportCreate } from './create.js';
import { reportUpdate } from './update.js';
import { reportDelete } from './delete.js';

const commands: Command[] = [
  reportList,
  reportListExport,
  reportGet,
  reportCreate,
  reportUpdate,
  reportDelete,
];

export default commands;
export { reportList };
export { reportListExport };
export { reportGet };
export { reportCreate };
export { reportUpdate };
export { reportDelete };
