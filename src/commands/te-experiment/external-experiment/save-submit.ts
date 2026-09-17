import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';

const METRIC_ROLES = new Set(['primary', 'secondary', 'guardrail']);

type JsonRecord = Record<string, unknown>;

/** Reads and validates external experiment group definitions. */
function readGroups(ctx: RuntimeContext): JsonRecord[] {
  const value = ctx.json('groups');
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error('Flag --groups must be a JSON array with at least two groups');
  }

  let controlCount = 0;
  for (let index = 0; index < value.length; index += 1) {
    const group = value[index];
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      throw new Error(`Flag --groups[${index}] must be a JSON object`);
    }
    const item = group as JsonRecord;
    if (typeof item.expGroupName !== 'string' || item.expGroupName.trim() === '') {
      throw new Error(`Flag --groups[${index}].expGroupName must be a non-empty string`);
    }
    if (item.isControl !== 0 && item.isControl !== 1) {
      throw new Error(`Flag --groups[${index}].isControl must be 0 or 1`);
    }
    if (item.isControl === 1) controlCount += 1;
  }
  if (controlCount !== 1) {
    throw new Error('Flag --groups must contain exactly one group with isControl=1');
  }
  return value as JsonRecord[];
}

/** Reads and validates external experiment metric bindings. */
function readMetrics(ctx: RuntimeContext): JsonRecord[] {
  const value = ctx.json('metrics');
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Flag --metrics must be a non-empty JSON array');
  }

  let hasPrimary = false;
  for (let index = 0; index < value.length; index += 1) {
    const metric = value[index];
    if (!metric || typeof metric !== 'object' || Array.isArray(metric)) {
      throw new Error(`Flag --metrics[${index}] must be a JSON object`);
    }
    const item = metric as JsonRecord;
    if (typeof item.metricId !== 'string' || item.metricId.trim() === '') {
      throw new Error(`Flag --metrics[${index}].metricId must be a non-empty string`);
    }
    if (typeof item.metricRole !== 'string' || !METRIC_ROLES.has(item.metricRole)) {
      throw new Error(`Flag --metrics[${index}].metricRole must be one of primary, secondary, guardrail`);
    }
    if (item.metricRole === 'primary') hasPrimary = true;
  }
  if (!hasPrimary) {
    throw new Error('Flag --metrics must contain at least one primary metric binding');
  }
  return value as JsonRecord[];
}

/** Builds a complete external experiment submit request. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const expId = ctx.str('exp-id').trim();
  const groups = readGroups(ctx);
  if (expId) {
    for (let index = 0; index < groups.length; index += 1) {
      if (typeof groups[index].expGroupId !== 'string' || groups[index].expGroupId.trim() === '') {
        throw new Error(`Flag --groups[${index}].expGroupId is required when --exp-id is provided`);
      }
    }
  }

  const req: JsonRecord = {
    expType: 'external',
    expName: ctx.str('exp-name'),
    bucketId: ctx.str('bucket-id'),
    startTime: ctx.str('start-time'),
    groups,
    metrics: readMetrics(ctx),
  };
  if (expId) req.expId = expId;

  const endTime = ctx.str('end-time');
  if (endTime !== '') req.endTime = endTime;
  const groupId = ctx.str('business-group-id');
  if (groupId !== '') req.groupId = groupId;
  const supposition = ctx.str('supposition');
  if (supposition !== '') req.expSupposition = supposition;
  const description = ctx.str('description');
  if (description !== '') req.expDesc = description;

  return { project_id: ctx.num('project-id'), req };
}

/** Creates or updates and submits a complete external experiment. */
export const externalExperimentSaveSubmit = createExperimentCapabilityCommand({
  resource: 'external-experiment',
  command: 'save-submit',
  capabilityId: 'experiment.experiment.save-submit',
  description: 'Create or update and submit an external experiment without Feature or traffic-layer configuration.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', desc: 'Existing external experiment ID; omit to create.' },
    { name: 'exp-name', type: 'string', required: true, desc: 'External experiment name.' },
    { name: 'business-group-id', type: 'string', desc: 'Optional business group ID.' },
    { name: 'bucket-id', type: 'string', required: true, desc: 'Existing analysis bucket ID for reported exposure and metric joins.' },
    { name: 'start-time', type: 'string', required: true, desc: 'External experiment start timestamp in ISO-8601 format with a timezone offset.' },
    { name: 'end-time', type: 'string', desc: 'Optional end timestamp in ISO-8601 format with a timezone offset; omit for a long-running experiment.' },
    { name: 'supposition', type: 'string', desc: 'Optional experiment hypothesis.' },
    { name: 'description', type: 'string', desc: 'Optional experiment description.' },
    {
      name: 'groups',
      type: 'json',
      required: true,
      desc: 'At least two group objects with camelCase expGroupName and isControl (exactly one 1). Existing submitted experiments also require unchanged expGroupId, allocation, and expGroupValue fields from get.',
    },
    {
      name: 'metrics',
      type: 'json',
      required: true,
      desc: 'Non-empty camelCase metric bindings with metricId and metricRole; include at least one primary metric.',
    },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
