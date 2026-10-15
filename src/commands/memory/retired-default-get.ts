import { retiredAgentFlag, retiredCommand } from './shared.js';
export const retiredDefaultGet = retiredCommand('+default-get', 'Use ae-cli workspace capability list.', [retiredAgentFlag]);
