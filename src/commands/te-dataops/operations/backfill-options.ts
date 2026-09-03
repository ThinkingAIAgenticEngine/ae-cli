import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function backfillJobFlags(): Flag[] {
  return [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'jobId', type: 'number', required: true, desc: 'Backfill job ID' },
  ];
}

export function buildBackfillJobArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    jobId: ctx.num('jobId'),
  };
}

export function validateBackfillJobId(ctx: RuntimeContext): void {
  validatePositiveSafeInteger(ctx, 'jobId');
}

export function validatePositiveSafeInteger(
  ctx: RuntimeContext,
  name: string,
  required = true,
): void {
  const raw = ctx.str(name).trim();
  if (!required && raw === '') return;
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new CliValidationError(`--${name} must be a positive safe integer`, {
      location: { field: name },
    });
  }
}

export function optionalBoolean(
  ctx: RuntimeContext,
  name: string,
  defaultValue?: boolean,
): boolean | undefined {
  return ctx.str(name) === '' ? defaultValue : ctx.bool(name);
}

export function hasValue(ctx: RuntimeContext, name: string): boolean {
  return ctx.str(name) !== '';
}

export function validateEnum(
  ctx: RuntimeContext,
  name: string,
  allowed: readonly string[],
): void {
  const value = ctx.str(name).trim();
  if (value !== '' && !allowed.includes(value)) {
    throw new CliValidationError(`--${name} must be ${formatAllowed(allowed)}`, {
      location: { field: name },
    });
  }
}

export function validateIsoDate(value: string, name: string): number {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw invalidDate(name);
  }
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw invalidDate(name);
  }
  return timestamp;
}

export function validateDateRange(startDate: string, endDate: string): void {
  const start = validateIsoDate(startDate, 'startDate');
  const end = validateIsoDate(endDate, 'endDate');
  if (start > end) {
    throw new CliValidationError('--startDate must not be after --endDate', {
      location: { field: 'startDate' },
    });
  }
}

function invalidDate(name: string): CliValidationError {
  return new CliValidationError(`--${name} must be a valid date in yyyy-MM-dd format`, {
    location: { field: name },
  });
}

function formatAllowed(allowed: readonly string[]): string {
  if (allowed.length === 1) return allowed[0];
  if (allowed.length === 2) return `${allowed[0]} or ${allowed[1]}`;
  return `${allowed.slice(0, -1).join(', ')}, or ${allowed.at(-1)}`;
}
