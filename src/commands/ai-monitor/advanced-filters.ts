import type { RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { QUALITY_FLAGS } from './quality-flags.js';
import { readFields, type ReadField } from './read-shared.js';

export const advancedFilterFlags: ReadField[] = [
  { name: 'filter-groups', type: 'json', sensitive: true, desc: 'Strict page filter group tree as JSON; maximum 10 rules and depth 2.' },
  { name: 'status', type: 'string', choices: ['STATUS_CODE_OK', 'STATUS_CODE_ERROR', 'STATUS_CODE_UNSET'], desc: 'Exact Trace status: STATUS_CODE_OK, STATUS_CODE_ERROR, or STATUS_CODE_UNSET.' },
  { name: 'user-cancelled', type: 'boolean', desc: 'Filter explicit user cancellation (true or false), independently of Trace status.' },
  { name: 'quality-flags', type: 'json', array: true, minItems: 1, maxItems: QUALITY_FLAGS.length, itemChoices: [...QUALITY_FLAGS], desc: 'JSON array of formal L0/L1/L2 flags; all flags must match. Startup failure: ["l2_infra_instant_death"].' },
];

export function buildAdvancedFilterInput(ctx: RuntimeContext): Record<string, unknown> {
  const input = readFields(ctx, advancedFilterFlags);
  if (input.filter_groups !== undefined) {
    const root = input.filter_groups;
    if (!root || typeof root !== 'object' || Array.isArray(root) || (root as Record<string, unknown>).type !== 'group') {
      throw new CliValidationError('--filter-groups must be a page filter group object.', { code: 'INVALID_AI_MONITOR_FILTERS' });
    }
  }
  return input;
}
