import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, settingsBody, targetDryRun, targetFlags, targetPatch } from './shared.js';

export const updateMemorySettings: Command = {
  service: MEMORY_SERVICE,
  command: '+settings-update',
  description: 'Update AgentSpace automatic memory extraction settings',
  flags: [...targetFlags, { name: 'auto-extraction-enabled', type: 'boolean', required: false, desc: 'Enable or disable automatic extraction for the AgentSpace' }, { name: 'excluded', type: 'boolean', required: false, desc: 'Exclude or include the target conversation' }],
  risk: 'write',
  validate: settingsBody,
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', 'settings', settingsBody(ctx)),
  execute: (ctx) => targetPatch(ctx, 'settings', settingsBody(ctx)),
};
