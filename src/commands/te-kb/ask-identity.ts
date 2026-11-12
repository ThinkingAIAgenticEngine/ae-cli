import { CliValidationError } from '../../core/errors.js';

/** Validate public execution identities without caching context metadata locally. */
export function askIdentity(value: unknown): string {
  function invalid(): never {
    throw new CliValidationError('Ask response is missing or has inconsistent readViews. This host may not support explicit contexts.', { code: 'KB_READ_CONTEXT_MISMATCH' });
  }
  if (!Array.isArray(value) || !value.length || value.length > 100) return invalid();
  const identities = value.map((view) => {
    if (!view || typeof view !== 'object') return invalid();
    const text = (key: string) => typeof view[key] === 'string' && view[key].trim().length > 0;
    if (!text('resourceKey') || !text('readIdentity')) return invalid();
    if (view.viewKind === 'candidate') {
      if (view.consistency !== 'candidate_pinned' || !text('candidateId') ||
          !(view.baseVersion === null || text('baseVersion')) || view.versionId !== null || view.versionNumber !== null)
        return invalid();
    } else if (view.viewKind !== 'snapshot' || view.consistency !== 'version_pinned' ||
        !text('versionId') || !Number.isSafeInteger(view.versionNumber) || view.versionNumber < 1) return invalid();
    return ['resourceKey', 'viewKind', 'consistency', 'readIdentity', 'versionId', 'versionNumber', 'candidateId', 'baseVersion'].map(key => view[key] ?? null);
  });
  if (new Set(identities.map(view => view[0])).size !== identities.length) return invalid();
  return JSON.stringify(identities.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
