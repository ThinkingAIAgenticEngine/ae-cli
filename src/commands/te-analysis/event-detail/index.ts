import type { Command } from '../../../framework/types.js';
import { eventDetailRun } from './run.js';
import { eventDetailExport } from './export.js';

const commands: Command[] = [
  eventDetailRun,
  eventDetailExport,
];

export default commands;
export { eventDetailRun };
export { eventDetailExport };
