import { retiredAgentFlag, retiredCommand, retiredScopeFlag } from './shared.js';
export const retiredOrganize = retiredCommand('+organize', 'Use ae-cli memory +extract.', [retiredAgentFlag, retiredScopeFlag]);
