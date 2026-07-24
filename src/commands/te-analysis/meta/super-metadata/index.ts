import type { Command } from '../../../../framework/types.js';
import { metadataSuperMetadataBatchCreate } from './batch-create.js';
import { metadataSuperMetadataBatchEdit } from './batch-edit.js';
import { metadataSuperMetadataExport } from './export.js';
import { metadataSuperMetadataImport } from './import.js';

const commands: Command[] = [
  metadataSuperMetadataBatchCreate,
  metadataSuperMetadataBatchEdit,
  metadataSuperMetadataExport,
  metadataSuperMetadataImport,
];

export default commands;
export { metadataSuperMetadataBatchCreate };
export { metadataSuperMetadataBatchEdit };
export { metadataSuperMetadataExport };
export { metadataSuperMetadataImport };
