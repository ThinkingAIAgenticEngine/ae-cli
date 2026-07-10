import type { Command } from '../../../../framework/types.js';
import { metadataPropertyList } from './list.js';
import { metadataPropertyGet } from './get.js';
import { metadataPropertyCreate } from './create.js';
import { metadataPropertyUpdate } from './update.js';
import { metadataPropertyRelationUpdate } from './relation-update.js';
import { metadataPropertyHideUpdate } from './hide-update.js';
import { metadataPropertyDelete } from './delete.js';
import { metadataPropertyInfluenceList } from './influence-list.js';
import { metadataPropertyChangelogList } from './changelog-list.js';
import { metadataPropertyRelatedEvents } from './related-events.js';

const commands: Command[] = [
  metadataPropertyList,
  metadataPropertyGet,
  metadataPropertyCreate,
  metadataPropertyUpdate,
  metadataPropertyRelationUpdate,
  metadataPropertyHideUpdate,
  metadataPropertyDelete,
  metadataPropertyInfluenceList,
  metadataPropertyChangelogList,
  metadataPropertyRelatedEvents,
];

export default commands;
export { metadataPropertyList };
export { metadataPropertyGet };
export { metadataPropertyCreate };
export { metadataPropertyUpdate };
export { metadataPropertyRelationUpdate };
export { metadataPropertyHideUpdate };
export { metadataPropertyDelete };
export { metadataPropertyInfluenceList };
export { metadataPropertyChangelogList };
export { metadataPropertyRelatedEvents };
