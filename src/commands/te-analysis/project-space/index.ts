import type { Command } from '../../../framework/types.js';
import { projectSpaceList } from './list.js';
import { projectSpaceGet } from './get.js';
import { projectSpaceBusinessFilterUpsert } from './business-filter-upsert.js';

const commands: Command[] = [
  projectSpaceList,
  projectSpaceGet,
  projectSpaceBusinessFilterUpsert,
];

export default commands;
export { projectSpaceList };
export { projectSpaceGet };
export { projectSpaceBusinessFilterUpsert };
