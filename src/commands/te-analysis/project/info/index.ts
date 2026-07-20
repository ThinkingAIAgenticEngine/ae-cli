import type { Command } from '../../../framework/types.js';
import { projectInfoGet } from './get.js';
import { projectInfoList } from './list.js';
import { projectInfoUpdate } from './update.js';

const commands: Command[] = [
  projectInfoGet,
  projectInfoList,
  projectInfoUpdate,
];

export default commands;
