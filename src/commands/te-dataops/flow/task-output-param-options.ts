import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';

export const MAX_OUTPUT_PARAM_REMARK_LENGTH = 200;
const PARAM_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export interface TaskOutputParamInput {
  paramKey: string;
  remark?: string;
}

export function createOutputParamsFlag(desc: string): Flag {
  return { name: 'outputParams', type: 'json', required: false, desc };
}

export function requireSpaceCode(ctx: RuntimeContext): string {
  const spaceCode = ctx.str('spaceCode');
  if (!spaceCode.trim()) {
    throw new CliValidationError('--spaceCode must be a non-empty string');
  }
  return spaceCode;
}

export function requirePositiveSafeInt(ctx: RuntimeContext, name: string): number {
  const raw = ctx.str(name).trim();
  const num = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(num)) {
    throw new CliValidationError(`--${name} must be a positive safe integer`, {
      location: { field: name },
    });
  }
  return num;
}

export function explicitString(ctx: RuntimeContext, name: string): string | undefined {
  const items = ctx.list ? ctx.list(name) : undefined;
  if (items && items.length > 0) {
    return items[0];
  }
  if (ctx.has?.(name)) {
    return ctx.str(name);
  }
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function resolveTaskOutputParams(ctx: RuntimeContext): TaskOutputParamInput[] | undefined {
  const raw = ctx.json('outputParams');
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new CliValidationError('--outputParams must be a JSON array');
  }
  const seen = new Set<string>();
  return raw.map((entry, idx) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new CliValidationError(`--outputParams[${idx}] must be an object with paramKey and optional remark`);
    }
    const record = entry as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key !== 'paramKey' && key !== 'remark') {
        throw new CliValidationError(
          `--outputParams[${idx}] has unsupported field "${key}"; only paramKey and remark are allowed`,
        );
      }
    }
    const paramKey = record.paramKey;
    if (typeof paramKey !== 'string' || !PARAM_KEY_PATTERN.test(paramKey) || paramKey.startsWith('ws_') || paramKey === 'env') {
      throw new CliValidationError(
        `--outputParams[${idx}].paramKey must be 1-40 lowercase letters, digits, or underscores, start with a letter, and must not be env or start with ws_`,
      );
    }
    if (seen.has(paramKey)) {
      throw new CliValidationError(`--outputParams contains duplicate paramKey "${paramKey}"`);
    }
    seen.add(paramKey);

    const remark = record.remark;
    if (remark !== undefined && remark !== null) {
      if (typeof remark !== 'string') {
        throw new CliValidationError(`--outputParams[${idx}].remark must be a string`);
      }
      if (remark.length > MAX_OUTPUT_PARAM_REMARK_LENGTH) {
        throw new CliValidationError(
          `--outputParams[${idx}].remark must not exceed ${MAX_OUTPUT_PARAM_REMARK_LENGTH} characters`,
        );
      }
      return { paramKey, remark };
    }
    return { paramKey };
  });
}
