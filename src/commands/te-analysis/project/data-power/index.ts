import type { Command } from '../../../framework/types.js';
import { projectDataPowerDelete } from './delete.js';
import { projectDataPowerGet } from './get.js';
import { projectDataPowerList } from './list.js';
import { projectDataPowerUpsert } from './upsert.js';

const commands: Command[] = [
  projectDataPowerDelete,
  projectDataPowerGet,
  projectDataPowerList,
  projectDataPowerUpsert,
];

export default commands;
