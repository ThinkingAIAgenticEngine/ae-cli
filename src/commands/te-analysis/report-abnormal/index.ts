import type { Command } from '../../../framework/types.js';
import { reportAbnormalGet } from './get.js';

const commands: Command[] = [
  reportAbnormalGet,
];

export default commands;
export { reportAbnormalGet };
