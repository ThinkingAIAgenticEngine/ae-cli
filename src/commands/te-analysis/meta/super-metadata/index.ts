import type { Command } from '../../../../framework/types.js';
import { metadataSuperMetadataExport } from './export.js';
import { metadataSuperMetadataImport } from './import.js';

const commands: Command[] = [
  metadataSuperMetadataExport,
  metadataSuperMetadataImport,
];

export default commands;
export { metadataSuperMetadataExport };
export { metadataSuperMetadataImport };
