import type { Command } from '../../../framework/types.js';
import { publicLinkCreate } from './create.js';
import { publicLinkList } from './list.js';
import { publicLinkUpdate } from './update.js';
import { publicLinkOffline } from './offline.js';
import { publicLinkDelete } from './delete.js';

const commands: Command[] = [
  publicLinkCreate,
  publicLinkList,
  publicLinkUpdate,
  publicLinkOffline,
  publicLinkDelete,
];

export default commands;
export { publicLinkCreate };
export { publicLinkList };
export { publicLinkUpdate };
export { publicLinkOffline };
export { publicLinkDelete };
