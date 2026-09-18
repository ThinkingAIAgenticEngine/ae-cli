import type { RuntimeContext } from '../../../framework/types.js';
import { addOptionalString, createExperimentCapabilityCommand } from '../capability-shared.js';

/** Builds the Feature detail input. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {
    project_id: ctx.num('project-id'),
    feature_key: ctx.str('feature-key'),
  };
  addOptionalString(input, 'version', ctx.str('version'));
  return input;
}

/** Gets one Feature by key and optional version. */
export const featureGet = createExperimentCapabilityCommand({
  resource: 'feature', command: 'get', capabilityId: 'experiment.feature.get',
  description: 'Get one Feature by key and optional version.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Feature key.' },
    { name: 'version', type: 'string', required: false, desc: 'Feature version ID.' },
  ],
  risk: 'read',
  buildInput,
});
