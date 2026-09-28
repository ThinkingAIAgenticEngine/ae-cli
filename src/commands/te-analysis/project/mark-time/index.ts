import type { Command } from '../../../framework/types.js';
import { projectMarkTimeCreate } from './create.js';
import { projectMarkTimeDelete } from './delete.js';
import { projectMarkTimeList } from './list.js';
import { projectMarkTimeUpdate } from './update.js';

const commands: Command[] = [
  projectMarkTimeCreate,
  projectMarkTimeDelete,
  projectMarkTimeList,
  projectMarkTimeUpdate,
];

export default commands;
