import type { RuntimeContext } from '../../../framework/types.js';

/** Reads the shared project and Feature identity without coercing an invalid ID. */
export function fixedValueIdentity(ctx: RuntimeContext): Record<string, unknown> {
  const projectId = ctx.num('project-id');
  const featureKey = ctx.str('feature-key');
  if (!Number.isInteger(projectId) || projectId < 1 || projectId > 2147483647) {
    throw new Error('Flag --project-id must be a positive 32-bit integer');
  }
  if (!featureKey.trim() || featureKey.length > 80) {
    throw new Error('Flag --feature-key must contain 1 to 80 characters and cannot be blank');
  }
  return { project_id: projectId, feature_key: featureKey };
}
