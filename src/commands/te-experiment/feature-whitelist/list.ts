import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    feature_key: ctx.str('feature-key'),
  };
}

/** Lists explicit whitelist rules for one Feature. */
export const featureWhitelistList = createExperimentCapabilityCommand({
  resource: 'feature whitelist', command: 'list',
  capabilityId: 'experiment.feature_whitelist.list',
  description: 'List explicit whitelist rules for one Feature.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Existing Feature key.' },
  ],
  risk: 'read',
  buildInput,
});
