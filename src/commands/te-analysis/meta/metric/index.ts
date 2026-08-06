import type { Command } from '../../../../framework/types.js';
import { metadataMetricList } from './list.js';
import { metadataMetricExport } from './export.js';
import { metadataMetricGet } from './get.js';
import { metadataMetricCreate } from './create.js';
import { metadataMetricUpdate } from './update.js';
import { metadataMetricDelete } from './delete.js';

const commands: Command[] = [
  metadataMetricList,
  metadataMetricExport,
  metadataMetricGet,
  metadataMetricCreate,
  metadataMetricUpdate,
  metadataMetricDelete,
];

export default commands;
export { metadataMetricList };
export { metadataMetricExport };
export { metadataMetricGet };
export { metadataMetricCreate };
export { metadataMetricUpdate };
export { metadataMetricDelete };
