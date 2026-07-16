import type { Command } from '../../../framework/types.js';
import { reportChangeLogList } from './list.js';
import { reportChangeLogGet } from './get.js';

const commands: Command[] = [
  reportChangeLogList,
  reportChangeLogGet,
];

export default commands;
export { reportChangeLogList };
export { reportChangeLogGet };
