import type { RuntimeContext } from '../../../framework/types.js';

const ITEM_FIELDS = new Set(['flowCode', 'left', 'right', 'checkTimeUnit']);
const TASK_ITEM_FIELDS = new Set([...ITEM_FIELDS, 'taskCode']);
const TIME_UNITS = new Set(['DAY', 'HOUR', 'MINUTE']);

export function buildCheckArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    checkItems: ctx.json('checkItems'),
    relation: optionalString(ctx, 'relation'),
    checkInterval: ctx.optionalNum('checkInterval'),
    checkTime: ctx.optionalNum('checkTime'),
  };
}

export function validateCheckArgs(ctx: RuntimeContext, requireTaskCode = false): void {
  const items = ctx.json('checkItems');
  const currentFlowCode = ctx.num('flowCode');
  const itemFields = requireTaskCode ? TASK_ITEM_FIELDS : ITEM_FIELDS;
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new Error('checkItems must be a JSON array with between 1 and 20 items');
  }

  items.forEach((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`checkItems[${index}] must be an object`);
    }
    for (const field of Object.keys(item)) {
      if (!itemFields.has(field)) {
        throw new Error(`checkItems[${index}] contains unsupported field "${field}"`);
      }
    }
    if (!Number.isSafeInteger(item.flowCode) || item.flowCode <= 0) {
      throw new Error(`checkItems[${index}].flowCode must be a positive integer`);
    }
    if (requireTaskCode && (!Number.isSafeInteger(item.taskCode) || item.taskCode <= 0)) {
      throw new Error(`checkItems[${index}].taskCode must be a positive integer`);
    }
    const minimum = item.flowCode === currentFlowCode ? 1 : 0;
    if (!Number.isInteger(item.left) || item.left < minimum) {
      throw new Error(`checkItems[${index}].left must be an integer greater than or equal to ${minimum}`);
    }
    if (!Number.isInteger(item.right) || item.right < minimum || item.right > item.left) {
      throw new Error(`checkItems[${index}].right must be an integer between ${minimum} and left`);
    }
    if (!TIME_UNITS.has(item.checkTimeUnit)) {
      throw new Error(`checkItems[${index}].checkTimeUnit must be DAY, HOUR, or MINUTE`);
    }
  });

  const relation = optionalString(ctx, 'relation');
  if (relation !== undefined && relation !== 'AND' && relation !== 'OR') {
    throw new Error('relation must be AND or OR');
  }
  for (const name of ['checkInterval', 'checkTime']) {
    const value = ctx.optionalNum(name);
    if (value !== undefined && !Number.isInteger(value)) {
      throw new Error(`${name} must be an integer`);
    }
  }
}

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}
