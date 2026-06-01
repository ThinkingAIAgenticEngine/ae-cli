import type { Command } from '../../framework/types.js';
import { query } from './query.js';

const commands: Command[] = [
  query,
];

export default commands;
export { query };
