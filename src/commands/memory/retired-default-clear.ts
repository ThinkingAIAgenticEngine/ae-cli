import { retiredAgentFlag, retiredCommand } from './shared.js';
export const retiredDefaultClear = retiredCommand('+default-clear', 'Use ae-cli workspace capability set.', [retiredAgentFlag]);
