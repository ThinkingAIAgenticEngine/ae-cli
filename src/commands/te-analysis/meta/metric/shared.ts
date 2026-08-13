import type { RuntimeContext } from '../../../../framework/types.js';
import { optionalNumber, optionalString } from '../../capability-shared.js';

export function metricMode(ctx: RuntimeContext): number {
  return modelTypeToMetricMode(ctx.str('model-type'));
}

export function optionalMetricMode(ctx: RuntimeContext): number | undefined {
  const mode = optionalNumber(ctx, 'metric-mode');
  const modelType = optionalString(ctx, 'model-type');
  const mapped = modelType === undefined ? undefined : modelTypeToMetricMode(modelType);
  if (mode !== undefined && mapped !== undefined && mode !== mapped) {
    throw new Error('--metric-mode must match --model-type when both are provided');
  }
  return mode ?? mapped;
}

function modelTypeToMetricMode(modelType: string): number {
  const normalized = modelType.trim().toLowerCase();
  if (normalized === 'event') {
    return 0;
  }
  if (normalized === 'retention') {
    return 1;
  }
  throw new Error('--model-type must be event or retention');
}
