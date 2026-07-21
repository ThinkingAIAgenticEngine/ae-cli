import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
  offsetFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export { compactInput, createAnalysisCapabilityCommand, offsetFlag, optionalNumber, optionalString, projectIdFlag, queryFlag };

export const alertIdFlag: Flag = {
  name: 'alert-id',
  type: 'number',
  required: true,
  desc: 'Alert task ID.',
};

export const definitionFlag: Flag = {
  name: 'definition',
  type: 'json',
  required: true,
  desc: 'Alert definition JSON object using snake_case field names. Read alert-definition-schema get first.',
};

export const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Page size. Default: 50, max: 200.',
  min: 1,
  max: 200,
};

export const startTimeFlag: Flag = {
  name: 'start-time',
  type: 'string',
  required: false,
  desc: 'Optional alert detail start time.',
};

export const endTimeFlag: Flag = {
  name: 'end-time',
  type: 'string',
  required: false,
  desc: 'Optional alert detail end time.',
};

export function projectInput(ctx: RuntimeContext): Record<string, unknown> {
  return { project_id: ctx.num('project-id') };
}

export function alertIdInput(ctx: RuntimeContext): Record<string, unknown> {
  return { ...projectInput(ctx), alert_id: ctx.num('alert-id') };
}
