import type { Command } from '../../../../framework/types.js';
import { metadataDataTableColumnsGet } from './columns-get.js';
import { metadataDataTableInfluenceList } from './influence-list.js';
import { metadataDataTableVersionList } from './version-list.js';
import { metadataDataTableVersionGet } from './version-get.js';

const commands: Command[] = [
  metadataDataTableColumnsGet,
  metadataDataTableInfluenceList,
  metadataDataTableVersionList,
  metadataDataTableVersionGet,
];

export default commands;
export { metadataDataTableColumnsGet };
export { metadataDataTableInfluenceList };
export { metadataDataTableVersionList };
export { metadataDataTableVersionGet };
