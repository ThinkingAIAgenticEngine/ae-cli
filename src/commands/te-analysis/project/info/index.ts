import type { Command } from '../../../framework/types.js';
import { projectInfoCreate } from './create.js';
import { projectInfoDelete } from './delete.js';
import { projectInfoGet } from './get.js';
import { projectInfoList } from './list.js';
import { projectInfoUpdate } from './update.js';

const commands: Command[] = [
  projectInfoCreate,
  projectInfoDelete,
  projectInfoGet,
  projectInfoList,
  projectInfoUpdate,
];

export default commands;
