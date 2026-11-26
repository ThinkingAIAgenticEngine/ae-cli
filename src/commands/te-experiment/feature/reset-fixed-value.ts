import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { fixedValueIdentity } from './shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input = fixedValueIdentity(ctx);
  if (ctx.has('request-id')) {
    const requestId = ctx.str('request-id');
    if (!requestId.trim() || requestId.length > 64) {
      throw new Error('Flag --request-id must contain 1 to 64 characters and cannot be blank');
    }
    input.request_id = requestId;
  }
  if (ctx.has('reason')) {
    const reason = ctx.str('reason');
    if (reason.length > 500) throw new Error('Flag --reason must contain at most 500 characters');
    input.reason = reason;
  }
  return input;
}

/** Clears all users' fixed results while keeping the fixed-value setting enabled. */
export const featureResetFixedValue = createExperimentCapabilityCommand({
  resource: 'feature', command: 'reset-fixed-value', capabilityId: 'experiment.feature.reset_fixed_value',
  description: 'Clear all users\' fixed Feature results while keeping fixing enabled; preserve experiment assignments.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Feature key, up to 80 characters.' },
    { name: 'request-id', type: 'string', desc: 'Optional tracing ID, up to 64 characters; generated when omitted. Reusing it does not deduplicate resets.' },
    { name: 'reason', type: 'string', desc: 'Optional reset reason saved in the operation log, up to 500 characters.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
