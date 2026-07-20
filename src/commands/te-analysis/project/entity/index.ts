import type { Command } from '../../../framework/types.js';
import { projectEntityCreate } from './create.js';
import { projectEntityDelete } from './delete.js';
import { projectEntityGet } from './get.js';
import { projectEntityList } from './list.js';
import { projectEntityUpdate } from './update.js';

const commands: Command[] = [
  projectEntityCreate,
  projectEntityDelete,
  projectEntityGet,
  projectEntityList,
  projectEntityUpdate,
];

export default commands;
