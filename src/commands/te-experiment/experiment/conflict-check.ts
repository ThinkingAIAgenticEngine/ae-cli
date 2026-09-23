import type { RuntimeContext } from '../../../framework/types.js';
import {
  addOptionalString,
  createExperimentCapabilityCommand,
  readRequiredStringArray,
} from '../capability-shared.js';

/** Builds the traffic-layer conflict-check input. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {
    project_id: ctx.num('project-id'),
    feature_key_list: readRequiredStringArray(ctx, 'feature-key-list'),
    traffic_layer_id: ctx.str('traffic-layer-id'),
  };
  addOptionalString(input, 'exp_id', ctx.str('exp-id'));
  return input;
}

/**
 * Pre-submit check for cross-layer Feature conflicts on a non-mutex traffic layer.
 * Do not call this for mutex traffic layers.
 */
export const experimentConflictCheck = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'conflict-check',
  capabilityId: 'experiment.experiment.conflict-check',
  description:
    'Pre-submit check for cross-layer Feature conflicts on a non-mutex traffic layer.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'feature-key-list',
      type: 'json',
      required: true,
      desc: 'Feature keys selected by the current experiment as a JSON string array.',
    },
    {
      name: 'traffic-layer-id',
      type: 'string',
      required: true,
      desc: 'Selected non-mutex traffic layer ID.',
    },
    {
      name: 'exp-id',
      type: 'string',
      required: false,
      desc: 'Current experiment ID when editing an existing draft.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    readRequiredStringArray(ctx, 'feature-key-list');
    if (ctx.str('traffic-layer-id') === '') {
      throw new Error('Flag --traffic-layer-id is required');
    }
  },
  buildInput,
});
