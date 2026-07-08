import type { Command } from '../../../framework/types.js';
import { biPanelList } from './list.js';
import { biPanelGet } from './get.js';
import { biPanelCreate } from './create.js';
import { biPanelUpdate } from './update.js';
import { biPanelDelete } from './delete.js';
import { biPanelShare } from './share.js';
import { biPanelCopy } from './copy.js';

const commands: Command[] = [
  biPanelList,
  biPanelGet,
  biPanelCreate,
  biPanelUpdate,
  biPanelDelete,
  biPanelShare,
  biPanelCopy,
];

export default commands;
export { biPanelList };
export { biPanelGet };
export { biPanelCreate };
export { biPanelUpdate };
export { biPanelDelete };
export { biPanelShare };
export { biPanelCopy };
