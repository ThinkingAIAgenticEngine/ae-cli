import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';

const METRIC_ROLES = new Set(['primary', 'secondary', 'guardrail']);

/** Reads and validates experiment metric bindings. */
function readMetricBindings(ctx: RuntimeContext): Array<Record<string, unknown>> {
  const value = ctx.json('metrics');
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Flag --metrics must be a non-empty JSON array');
  }
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Flag --metrics[${index}] must be a JSON object`);
    }
    const metricId = (item as Record<string, unknown>).metricId;
    const metricRole = (item as Record<string, unknown>).metricRole;
    if (typeof metricId !== 'string' || metricId.trim() === '') {
      throw new Error(`Flag --metrics[${index}].metricId must be a non-empty string`);
    }
    if (typeof metricRole !== 'string' || !METRIC_ROLES.has(metricRole)) {
      throw new Error(`Flag --metrics[${index}].metricRole must be one of primary, secondary, guardrail`);
    }
  }
  return value as Array<Record<string, unknown>>;
}

/** Replaces an experiment draft's metric bindings, including guardrail metrics. */
export const experimentUpdateMetrics = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'update-metrics', capabilityId: 'experiment.experiment.save',
  description: 'Replace experiment metric bindings and assign primary, secondary, or guardrail roles.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment draft ID.' },
    {
      name: 'metrics',
      type: 'json',
      required: true,
      desc: 'Non-empty metric binding array with camelCase metricId and metricRole fields; replaces all saved bindings.',
    },
  ],
  risk: 'write',
  validate: (ctx) => { readMetricBindings(ctx); },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    req: { expId: ctx.str('exp-id'), metrics: readMetricBindings(ctx) },
  }),
});
