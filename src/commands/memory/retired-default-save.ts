import { retiredAgentFlag, retiredCommand } from './shared.js';
export const retiredDefaultSave = retiredCommand('+default-save', 'Use ae-cli workspace capability set.', [
  retiredAgentFlag,
  { name: 'selection-json', type: 'string', required: false, desc: 'Retired session selection JSON' },
]);
