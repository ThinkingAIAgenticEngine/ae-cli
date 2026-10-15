import { retiredAgentFlag, retiredCommand } from './shared.js';
export const retiredMarkUsed = retiredCommand('+mark-used', 'Memory usage accounting is handled automatically by the AgentSpace runtime.', [
  { name: 'ids', type: 'json', required: false, desc: 'Retired memory ID list' },
  retiredAgentFlag,
]);
