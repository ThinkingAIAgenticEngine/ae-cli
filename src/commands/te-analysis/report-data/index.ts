import type { Command } from '../../../framework/types.js';
import { reportDataRun } from './run.js';
import { reportDataExport } from './export.js';

const commands: Command[] = [
  reportDataRun,
  reportDataExport,
];

export default commands;
export { reportDataRun };
export { reportDataExport };
