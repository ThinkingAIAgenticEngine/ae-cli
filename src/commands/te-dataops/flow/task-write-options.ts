import type { Flag, RuntimeContext } from '../../../framework/types.js';

export const createTaskWriteFlags: Flag[] = [
  { name: 'preTasks', type: 'json', required: false, desc: 'Upstream task codes as a JSON array. Omit for no dependencies' },
  { name: 'failRetryTimes', type: 'number', required: false, default: 3, min: 0, max: 24, desc: 'Failure retry count. Default 3; use 0 to disable retries' },
  { name: 'failRetryInterval', type: 'number', required: false, default: 5, min: 1, max: 60, desc: 'Failure retry interval in minutes. Default 5' },
  { name: 'failRetryUnit', type: 'string', required: false, default: 'MINUTE', desc: 'Failure retry unit. Only MINUTE is supported' },
];

export const updateTaskWriteFlags: Flag[] = [
  { name: 'preTasks', type: 'json', required: false, desc: 'Upstream task codes as a JSON array. Omit to keep existing dependencies; [] clears them; a non-empty array replaces them' },
  { name: 'failRetryTimes', type: 'number', required: false, min: 0, max: 24, desc: 'Failure retry count. Omit to keep the existing value; use 0 to disable retries' },
  { name: 'failRetryInterval', type: 'number', required: false, min: 1, max: 60, desc: 'Failure retry interval in minutes. Omit to keep the existing value' },
  { name: 'failRetryUnit', type: 'string', required: false, desc: 'Failure retry unit. Only MINUTE is supported; omit to keep the existing value' },
];

export function buildTaskWriteArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    preTasks: ctx.json('preTasks'),
    failRetryTimes: ctx.optionalNum('failRetryTimes'),
    failRetryInterval: ctx.optionalNum('failRetryInterval'),
    failRetryUnit: optionalString(ctx, 'failRetryUnit'),
  };
}

export function validateTaskWriteArgs(ctx: RuntimeContext): void {
  const preTasks = ctx.json('preTasks');
  if (preTasks !== undefined && (
    !Array.isArray(preTasks)
    || preTasks.some((taskCode) => !Number.isSafeInteger(taskCode) || taskCode <= 0)
  )) {
    throw new Error('preTasks must be a JSON array of positive integer task codes');
  }
  if (preTasks !== undefined && new Set(preTasks).size !== preTasks.length) {
    throw new Error('preTasks must not contain duplicate task codes');
  }

  for (const name of ['failRetryTimes', 'failRetryInterval']) {
    const value = ctx.optionalNum(name);
    if (value !== undefined && !Number.isInteger(value)) {
      throw new Error(`${name} must be an integer`);
    }
  }

  const failRetryUnit = optionalString(ctx, 'failRetryUnit');
  if (failRetryUnit !== undefined && failRetryUnit !== 'MINUTE') {
    throw new Error('failRetryUnit must be MINUTE');
  }
}

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}
