import type { Command } from '../../../framework/types.js';
import { projectSpaceList } from './list.js';
import { projectSpaceGet } from './get.js';
import { projectSpaceCreate } from './create.js';
import { projectSpaceDelete } from './delete.js';
import { projectSpaceShare } from './share.js';
import { projectSpaceMembers } from './members.js';

const commands: Command[] = [
  projectSpaceList,
  projectSpaceGet,
  projectSpaceCreate,
  projectSpaceDelete,
  projectSpaceShare,
  projectSpaceMembers,
];

export default commands;
export { projectSpaceList };
export { projectSpaceGet };
export { projectSpaceCreate };
export { projectSpaceDelete };
export { projectSpaceShare };
export { projectSpaceMembers };
