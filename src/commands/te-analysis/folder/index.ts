import type { Command } from '../../../framework/types.js';
import { folderCreate } from './create.js';
import { folderDelete } from './delete.js';
import { folderShare } from './share.js';
import { folderMembers } from './members.js';

const commands: Command[] = [
  folderCreate,
  folderDelete,
  folderShare,
  folderMembers,
];

export default commands;
export { folderCreate };
export { folderDelete };
export { folderShare };
export { folderMembers };
