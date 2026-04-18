import type { Command } from '../../framework/types.js';
import meta from './meta/index.js';
import project from './project/index.js';
import entity from './entity/index.js';

const commands: Command[] = [
  ...meta,
  ...project,
  ...entity,
];

export default commands;
