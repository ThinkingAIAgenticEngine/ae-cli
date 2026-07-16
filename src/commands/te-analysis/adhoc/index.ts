import type { Command } from '../../../framework/types.js';
import { adhocRun } from './run.js';
import { adhocExport } from './export.js';

const commands: Command[] = [
  adhocRun,
  adhocExport,
];

export default commands;
export { adhocRun };
export { adhocExport };
