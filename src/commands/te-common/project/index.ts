import type { Command } from '../../../framework/types.js';
import { listProjects } from './list-projects.js';

const commands: Command[] = [
  listProjects,
];

export default commands;
export { listProjects };
