import type { Command } from '../../../../framework/types.js';
import { metadataMetricList } from './list.js';
import { metadataMetricGet } from './get.js';
import { metadataMetricCreate } from './create.js';
import { metadataMetricUpdate } from './update.js';
import { metadataMetricDelete } from './delete.js';

const commands: Command[] = [
  metadataMetricList,
  metadataMetricGet,
  metadataMetricCreate,
  metadataMetricUpdate,
  metadataMetricDelete,
];

export default commands;
export { metadataMetricList };
export { metadataMetricGet };
export { metadataMetricCreate };
export { metadataMetricUpdate };
export { metadataMetricDelete };
