import type { RuntimeContext } from '../../framework/types.js';

export function hasFlag(ctx: RuntimeContext, name: string): boolean {
  return ctx.str(name) !== '';
}

export function readOptionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function readOptionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  return hasFlag(ctx, name) ? ctx.num(name) : undefined;
}

export function readOptionalBoolean(ctx: RuntimeContext, name: string): boolean | undefined {
  return hasFlag(ctx, name) ? ctx.bool(name) : undefined;
}

export function readOptionalJsonArray(ctx: RuntimeContext, name: string): any[] | undefined {
  const value = ctx.json(name);
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Flag --${name} must be a JSON array`);
  }
  return value;
}

export function readRequiredJsonArray(ctx: RuntimeContext, name: string, minLength = 1): any[] {
  const value = readOptionalJsonArray(ctx, name);
  if (!value || value.length < minLength) {
    throw new Error(`Flag --${name} must be a JSON array with at least ${minLength} item(s)`);
  }
  return value;
}

export function readRequiredJsonObject(ctx: RuntimeContext, name: string): Record<string, any> {
  const value = ctx.json(name);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Flag --${name} must be a JSON object`);
  }
  return value;
}

export function requireOneOfFlags(ctx: RuntimeContext, names: string[]): void {
  if (!names.some((name) => hasFlag(ctx, name))) {
    throw new Error(`At least one of ${names.map((name) => `--${name}`).join(', ')} is required`);
  }
}

export function requireAnyFlag(ctx: RuntimeContext, names: string[]): void {
  if (!names.some((name) => hasFlag(ctx, name))) {
    throw new Error(`At least one of ${names.map((name) => `--${name}`).join(', ')} is required`);
  }
}

export function requireAllowedValue(value: string, allowed: string[], flagName: string): void {
  if (!allowed.includes(value)) {
    throw new Error(`Flag --${flagName} must be one of: ${allowed.join(', ')}`);
  }
}
