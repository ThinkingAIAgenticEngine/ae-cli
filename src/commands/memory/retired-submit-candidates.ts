import { retiredAgentFlag, retiredCommand, retiredScopeFlag } from './shared.js';

export const retiredSubmitCandidates = retiredCommand('+submit-candidates', 'Use ae-cli memory +candidate-submit.', [
  { name: 'candidates-json', type: 'string', required: false, desc: 'Retired candidate JSON input' },
  { name: 'stdin', type: 'boolean', required: false, desc: 'Retired stdin input switch' },
  { name: 'source-type', type: 'string', required: false, desc: 'Retired source type' },
  { name: 'source-name', type: 'string', required: false, desc: 'Retired source name' },
  { name: 'source-agent', type: 'string', required: false, desc: 'Retired source Agent name' },
  { name: 'source-session-id', type: 'string', required: false, desc: 'Retired source session ID' },
  retiredScopeFlag,
  retiredAgentFlag,
  { name: 'auto-approve', type: 'boolean', required: false, desc: 'Retired automatic approval switch' },
]);
