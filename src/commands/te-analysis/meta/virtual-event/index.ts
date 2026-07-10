import type { Command } from '../../../../framework/types.js';
import { metadataVirtualEventCreate } from './create.js';
import { metadataVirtualEventGet } from './get.js';
import { metadataVirtualEventDelete } from './delete.js';

const commands: Command[] = [
  metadataVirtualEventCreate,
  metadataVirtualEventGet,
  metadataVirtualEventDelete,
];

export default commands;
export { metadataVirtualEventCreate };
export { metadataVirtualEventGet };
export { metadataVirtualEventDelete };
