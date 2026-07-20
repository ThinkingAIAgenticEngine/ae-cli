import type { Command } from '../../../framework/types.js';
import { projectMemberHandoverExport } from './export.js';
import { projectMemberHandoverRun } from './run.js';

const commands: Command[] = [
  projectMemberHandoverExport,
  projectMemberHandoverRun,
];

export default commands;
