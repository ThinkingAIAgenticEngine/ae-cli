import type { Command } from '../../../../framework/types.js';
import { metadataEventList } from './list.js';
import { metadataEventGet } from './get.js';
import { metadataEventCreate } from './create.js';
import { metadataEventUpdate } from './update.js';
import { metadataEventRelationUpdate } from './relation-update.js';
import { metadataEventHideUpdate } from './hide-update.js';
import { metadataEventDelete } from './delete.js';
import { metadataEventInfluenceList } from './influence-list.js';
import { metadataEventChangelogList } from './changelog-list.js';

const commands: Command[] = [
  metadataEventList,
  metadataEventGet,
  metadataEventCreate,
  metadataEventUpdate,
  metadataEventRelationUpdate,
  metadataEventHideUpdate,
  metadataEventDelete,
  metadataEventInfluenceList,
  metadataEventChangelogList,
];

export default commands;
export { metadataEventList };
export { metadataEventGet };
export { metadataEventCreate };
export { metadataEventUpdate };
export { metadataEventRelationUpdate };
export { metadataEventHideUpdate };
export { metadataEventDelete };
export { metadataEventInfluenceList };
export { metadataEventChangelogList };
