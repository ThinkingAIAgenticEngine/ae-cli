import { createAiMonitorCapabilityCommand } from '../shared.js';

export const platformList = createAiMonitorCapabilityCommand({
  resource: 'platform',
  command: 'list',
  capabilityId: 'ai_monitor.platform.list',
  description: 'List Agent platforms and their runtime environments.',
  helpText: 'Use platform_name/environment_name for readable commands, or platform_id/environment_id for stable automation.',
  flags: [],
  risk: 'read',
  buildInput: () => ({}),
});
