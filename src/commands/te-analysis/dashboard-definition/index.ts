import type { Command } from '../../../framework/types.js';
import { dashboardDefinitionExport } from './export.js';
import { dashboardDefinitionImport } from './import.js';

const commands: Command[] = [
  dashboardDefinitionExport,
  dashboardDefinitionImport,
];

export default commands;
export { dashboardDefinitionExport };
export { dashboardDefinitionImport };
