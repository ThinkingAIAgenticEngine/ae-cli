import type { RuntimeContext } from '../../../framework/types.js';
import { addOptionalString, createExperimentCapabilityCommand } from '../capability-shared.js';

/** Builds the experiment list input with optional filters. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {
    project_id: ctx.num('project-id'),
  };
  addOptionalString(input, 'status', ctx.str('status'));
  addOptionalString(input, 'traffic_layer_id', ctx.str('traffic-layer-id'));
  addOptionalString(input, 'group_id', ctx.str('group-id'));
  addOptionalString(input, 'query_name', ctx.str('query-name'));
  return input;
}

/** Lists experiments in a project with optional filters. */
export const experimentList = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'list', capabilityId: 'experiment.experiment.list',
  description: 'List experiments in a project with optional status, traffic layer, group, and name filters.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'status',
      type: 'string',
      required: false,
      desc: 'Experiment status filter: draft, testing, pending, running, paused, ended, or archive.',
    },
    {
      name: 'traffic-layer-id',
      type: 'string',
      required: false,
      desc: 'Traffic layer ID filter.',
    },
    {
      name: 'group-id',
      type: 'string',
      required: false,
      desc: 'Business group ID filter.',
    },
    {
      name: 'query-name',
      type: 'string',
      required: false,
      desc: 'Fuzzy match against experiment name (exp_name LIKE).',
    },
  ],
  risk: 'read',
  buildInput,
});
