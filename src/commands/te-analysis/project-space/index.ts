import type { Command } from '../../../framework/types.js';
import { projectSpaceList } from './list.js';
import { projectSpaceGet } from './get.js';

const commands: Command[] = [
  projectSpaceList,
  projectSpaceGet,
];

export default commands;
export { projectSpaceList };
export { projectSpaceGet };
