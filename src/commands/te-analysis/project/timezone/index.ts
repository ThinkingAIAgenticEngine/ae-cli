import type { Command } from '../../../framework/types.js';
import { projectTimezoneGet } from './get.js';
import { projectTimezoneOverview } from './overview.js';
import { projectTimezoneUpdate } from './update.js';

const commands: Command[] = [
  projectTimezoneGet,
  projectTimezoneOverview,
  projectTimezoneUpdate,
];

export default commands;
