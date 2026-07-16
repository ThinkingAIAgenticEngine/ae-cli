import type { Command } from '../../../framework/types.js';
import { entityDetailRun } from './run.js';
import { entityDetailExport } from './export.js';

const commands: Command[] = [
  entityDetailRun,
  entityDetailExport,
];

export default commands;
export { entityDetailRun };
export { entityDetailExport };
