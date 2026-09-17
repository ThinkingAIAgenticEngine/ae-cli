import type { Flag, RuntimeContext } from '../../../../framework/types.js';

export const projectFlag: Flag = {
  name: 'project-id', type: 'number', required: true, min: 1,
  desc: 'Numeric project ID.',
};
export const batchFlag: Flag = {
  name: 'batch-id', type: 'string', required: true,
  desc: 'Review batch ID as a decimal string; preserve all digits.',
};
export const clientRequestFlag: Flag = {
  name: 'client-request-id', type: 'string', required: true,
  desc: 'Stable operation key. Reuse for network replay; use a new key for a new decision or manual retry.',
};

export function text(ctx: RuntimeContext, name: string): string {
  const value = ctx.str(name);
  if (!value.trim()) throw new Error(`--${name} must not be empty.`);
  return value;
}

export function decimalId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)
    || BigInt(value) > 9223372036854775807n) {
    throw new Error(`${name} must be a positive signed 64-bit decimal string.`);
  }
  return value;
}

export function projectInput(ctx: RuntimeContext): Record<string, unknown> {
  const id = ctx.num('project-id');
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new Error('--project-id must be a positive 32-bit integer.');
  }
  return { project_id: id };
}

export function batchInput(ctx: RuntimeContext): Record<string, unknown> {
  return { ...projectInput(ctx), batch_id: decimalId(ctx.str('batch-id'), '--batch-id') };
}

export function object(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

export function array(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5000) {
    throw new Error(`${name} must contain 1 to 5000 items.`);
  }
  return value;
}

export function fields(value: Record<string, unknown>, allowed: string[], name: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${name} has unsupported fields: ${unknown.join(', ')}.`);
}

export function unique(values: unknown[], name: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${name} must be unique.`);
}
