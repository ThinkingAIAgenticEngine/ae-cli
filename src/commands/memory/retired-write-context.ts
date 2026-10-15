import { retiredAgentFlag, retiredCommand } from './shared.js';
export const retiredWriteContext = retiredCommand('+write-context', 'Use ae-cli memory +context; AgentSpace runtime injection is automatic.', [
  { name: 'file', type: 'string', required: false, desc: 'Retired local output file' },
  retiredAgentFlag,
  { name: 'limit', type: 'number', required: false, desc: 'Retired context limit' },
]);
