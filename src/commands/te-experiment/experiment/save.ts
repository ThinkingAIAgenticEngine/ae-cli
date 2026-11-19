import type { RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

const layerTypes = new Set(['remote', 'local']);

/** Validates traffic-layer mode fields before saving an experiment draft. */
export function validateExperimentSaveRequest(req: Record<string, unknown>): void {
  const layerType = req.layerType;
  if (layerType !== undefined
      && (typeof layerType !== 'string' || !layerTypes.has(layerType))) {
    throw new Error('Flag --req.layerType must be one of: remote, local');
  }
  if (layerType !== undefined && req.isExpSharing !== 0) {
    throw new Error('Flag --req.layerType requires --req.isExpSharing=0');
  }
  if (layerType === 'local' && req.bucketId === '#user_id') {
    throw new Error('Flag --req.bucketId #user_id is not supported when --req.layerType=local');
  }
}

/** Reads an optional timestamp without inferring the caller's timezone. */
function readTimestamp(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  if (!(ctx.has?.(name) ?? value !== '')) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      || !Number.isFinite(Date.parse(value))) {
    throw new CliValidationError(`Flag --${name} must be an ISO-8601 timestamp with a timezone offset`);
  }
  return value;
}

/** Merges optional Feature timing flags into the native save request. */
function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const req = { ...readRequiredObject(ctx, 'req') };
  validateExperimentSaveRequest(req);
  const startTime = readTimestamp(ctx, 'start-time');
  const fixedEndTime = readTimestamp(ctx, 'fixed-end-time');
  if (startTime !== undefined || fixedEndTime !== undefined) {
    if (req.expType && req.expType !== 'feature') {
      throw new CliValidationError('Flags --start-time and --fixed-end-time only support Feature experiments');
    }
    if (startTime !== undefined) req.startTime = startTime;
    if (fixedEndTime !== undefined) {
      if (req.expCycle != null && (typeof req.expCycle !== 'object' || Array.isArray(req.expCycle))) {
        throw new CliValidationError('Field req.expCycle must be a JSON object when --fixed-end-time is provided');
      }
      req.expCycle = { ...(req.expCycle as Record<string, unknown> | undefined), cycleType: 'time', fixedEndTime };
    }
  }
  return { project_id: ctx.num('project-id'), req };
}

/** Creates or updates an experiment, including Feature timing configuration. */
export const experimentSave = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'save', capabilityId: 'experiment.experiment.save',
  description: 'Create or update an experiment, including Feature start and end times.',
  helpText: 'Timing flags override matching fields in --req. Saving a draft does not submit or start it.\n'
    + 'After readiness checks, use experiment experiment manage --target-status pending to submit once.\n'
    + 'That submission path works on older and approval-enabled servers.\n'
    + 'On updated servers, delivery changes enter approval only for Feature experiments with configured approvers.\n'
    + 'External experiments and Feature experiments with an empty roster save directly; existing pending reviews still block edits.\n'
    + 'Verify runtime status with experiment get; use approval commands only when supported.\n'
    + 'Use timestamps with minutes 00 or 30 to align with scheduling checks.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'req',
      type: 'json',
      required: true,
      desc: 'Native camelCase request; custom audiences use targeting.definitionRequest, never targetConfig; optional domainId selects an exclusive draft domain; exclusive local routing uses isExpSharing=0, layerType=local, and a bucketId other than #user_id.',
    },
    { name: 'start-time', type: 'string', desc: 'Optional Feature start timestamp with timezone offset; overrides req.startTime. The server clears seconds and milliseconds.' },
    { name: 'fixed-end-time', type: 'string', desc: 'Optional Feature deadline with timezone offset; sets req.expCycle.cycleType=time and overrides fixedEndTime.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
