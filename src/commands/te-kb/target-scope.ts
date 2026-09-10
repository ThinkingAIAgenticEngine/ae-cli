import { CliValidationError } from '../../core/errors.js';
import type { RuntimeContext } from '../../framework/types.js';

export type ExternalKnowledgeBaseTargetScope = 'personal' | 'company';

export function getExternalKnowledgeBaseTargetScope(
  ctx: Pick<RuntimeContext, 'str'>,
): ExternalKnowledgeBaseTargetScope | undefined {
  const scope = ctx.str('scope').trim();
  if (!scope) return undefined;
  if (scope === 'personal' || scope === 'company') return scope;
  throw new CliValidationError(
    `Invalid --scope: ${scope}. Must be one of: personal | company`,
  );
}
