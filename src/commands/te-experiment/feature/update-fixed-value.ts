import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { fixedValueIdentity } from './shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input = fixedValueIdentity(ctx);
  if (!ctx.has('enabled')) throw new Error('Flag --enabled is required; use true or false');
  return { ...input, fixed_value_enabled: ctx.bool('enabled') };
}

/** Changes fixed-value behavior through the existing Feature publication boundary. */
export const featureUpdateFixedValue = createExperimentCapabilityCommand({
  resource: 'feature', command: 'update-fixed-value', capabilityId: 'experiment.feature.update_fixed_value',
  description: 'Enable or disable fixed Feature values. Disabling clears all users\' fixed results.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Feature key, up to 80 characters.' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'true to fix the first valid result; false to clear fixed results and disable fixing.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
