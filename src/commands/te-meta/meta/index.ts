import type { Command } from '../../../framework/types.js';
import { batchEditMetadata } from './batch-edit-metadata.js';
import { batchCreateMetadata } from './batch-create-metadata.js';

const commands: Command[] = [
  batchEditMetadata,
  batchCreateMetadata,
];

export default commands;
