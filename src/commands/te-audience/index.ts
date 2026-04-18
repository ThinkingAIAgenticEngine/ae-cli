import type { Command } from '../../framework/types.js';
import cluster from './cluster/index.js';
import tag from './tag/index.js';
import schema from './schema/index.js';

const commands: Command[] = [
  ...cluster,
  ...tag,
  ...schema,
];

export default commands;
