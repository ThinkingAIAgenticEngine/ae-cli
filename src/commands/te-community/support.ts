import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';

const INTEGER_ENUMS: Record<string, readonly number[]> = {
  '+get_comment_tag_analysis:resource-type': [0, 1],
  '+get_post_detail:resource-type': [0, 1],
  '+get_post_detail:danmu-order-by': [0, 1],
  '+get_post_detail:reply-order-by': [0, 1],
  '+get_livestream_detail:order-by': [0, 1],
  '+get_hot_topics:order-by': [0, 1],
  '+get_risk_content:order-by': [0],
  '+search_posts:search-mode': [0, 1, 2],
  '+search_posts:order-by': [0, 1, 2, 3, 4],
};

const INTEGER_LIST_ENUMS: Record<string, readonly number[]> = {
  '+get_livestream_detail:activity-types': [0, 1, 2, 3],
  '+search_posts:resource-type': [0, 1],
  '+search_posts:sentiment-types': [0, 1, 2],
};

/** Shared validation for the legacy-named, read-only community commands. */
export function validateCommunityCommand(ctx: RuntimeContext, command: Command): void {
  const gameId = ctx.optionalInt64('game-id');
  const spaceId = command.flags.some((flag) => flag.name === 'space-id')
    ? ctx.int64('space-id')
    : undefined;
  if (spaceId !== undefined && gameId !== undefined && gameId !== spaceId) {
    throw validationError(
      '--game-id must match --space-id',
      'Omit --game-id; it is a deprecated compatibility alias and defaults to --space-id.',
    );
  }

  validateTemporalFlag(ctx, command, 'date', 'date');
  validateTemporalFlag(ctx, command, 'start-time', 'date-time');
  validateTemporalFlag(ctx, command, 'end-time', 'date-time');
  validateTemporalFlag(ctx, command, 'anchor-time', 'minute');
  validateTemporalFlag(ctx, command, 'year', 'year');
  validateRange(ctx, command);

  validateInt64Csv(ctx, command, 'channel-id-list');
  validateInt64Csv(ctx, command, 'risk-codes');
  if (command.flags.some((flag) => flag.name === 'tag-filters') && ctx.str('tag-filters').trim()) {
    validateTagFilters(ctx.json('tag-filters'));
  }

  for (const [key, choices] of Object.entries(INTEGER_ENUMS)) {
    const [commandName, flagName] = key.split(':');
    if (command.command === commandName) validateIntegerEnum(ctx, command, flagName, choices);
  }
  for (const [key, choices] of Object.entries(INTEGER_LIST_ENUMS)) {
    const [commandName, flagName] = key.split(':');
    if (command.command === commandName) validateIntegerCsv(ctx, command, flagName, choices);
  }
}

export function int64Csv(ctx: RuntimeContext, name: string): bigint[] | undefined {
  const raw = ctx.str(name).trim();
  if (!raw) return undefined;
  return raw.split(',').map((value) => BigInt(value.trim()));
}

export function stringCsv(ctx: RuntimeContext, name: string): string[] | undefined {
  const raw = ctx.str(name).trim();
  if (!raw) return undefined;
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function tagFilters(ctx: RuntimeContext): Record<string, unknown>[] | undefined {
  const raw = ctx.str('tag-filters').trim();
  if (!raw) return undefined;
  const value = ctx.json('tag-filters');
  validateTagFilters(value);
  return value;
}

function validateTemporalFlag(
  ctx: RuntimeContext,
  command: Command,
  name: string,
  format: 'date' | 'date-time' | 'minute' | 'year',
): void {
  if (!command.flags.some((flag) => flag.name === name)) return;
  const value = ctx.str(name).trim();
  if (!value) return;
  if (format === 'year') {
    if (!/^\d{4}$/.test(value)) {
      throw validationError(`--${name} must use yyyy format`);
    }
    return;
  }
  if (format === 'minute') {
    if (!parseDateTime(value, true)) {
      throw validationError(`--${name} must use yyyy-MM-dd HH:mm format`);
    }
    return;
  }
  if (format === 'date') {
    if (!parseDate(value)) {
      throw validationError(`--${name} must be a valid date in yyyy-MM-dd format`);
    }
    return;
  }
  if (!parseDate(value) && !parseDateTime(value, false)) {
    throw validationError(
      `--${name} must be a valid date or timestamp`,
      'Use yyyy-MM-dd, yyyy-MM-dd HH:mm, or yyyy-MM-dd HH:mm:ss.',
    );
  }
}

function validateRange(ctx: RuntimeContext, command: Command): void {
  if (!command.flags.some((flag) => flag.name === 'start-time')
    || !command.flags.some((flag) => flag.name === 'end-time')) return;
  const start = temporalValue(ctx.str('start-time'));
  const end = temporalValue(ctx.str('end-time'));
  if (start !== undefined && end !== undefined && end < start) {
    throw validationError('--end-time must not be earlier than --start-time');
  }
}

function validateInt64Csv(ctx: RuntimeContext, command: Command, name: string): void {
  if (!command.flags.some((flag) => flag.name === name)) return;
  const raw = ctx.str(name).trim();
  if (!raw) return;
  const values = raw.split(',');
  const max = (1n << 63n) - 1n;
  for (const value of values) {
    const item = value.trim();
    if (!/^[1-9]\d*$/.test(item) || BigInt(item) > max) {
      throw validationError(`--${name} must be a comma-separated list of positive int64 values`);
    }
  }
}

function validateIntegerEnum(
  ctx: RuntimeContext,
  command: Command,
  name: string,
  choices: readonly number[],
): void {
  if (!command.flags.some((flag) => flag.name === name)) return;
  const raw = ctx.str(name).trim();
  if (!raw) return;
  const value = Number(raw);
  if (!Number.isInteger(value) || !choices.includes(value)) {
    throw validationError(`--${name} must be one of: ${choices.join(', ')}`);
  }
}

function validateIntegerCsv(
  ctx: RuntimeContext,
  command: Command,
  name: string,
  choices: readonly number[],
): void {
  if (!command.flags.some((flag) => flag.name === name)) return;
  const raw = ctx.str(name).trim();
  if (!raw) return;
  const values = raw.split(',').map((value) => Number(value.trim()));
  if (values.some((value) => !Number.isInteger(value) || !choices.includes(value))) {
    throw validationError(
      `--${name} must be a comma-separated list containing only: ${choices.join(', ')}`,
    );
  }
}

function validateTagFilters(value: unknown): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw validationError('--tag-filters must be a JSON array');
  }
  const required = ['tagName', 'tagCode', 'inferenceType', 'calcuSymbol'];
  value.forEach((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw validationError(`--tag-filters item ${index + 1} must be an object`);
    }
    const record = item as Record<string, unknown>;
    for (const field of required) {
      if (typeof record[field] !== 'string' || !(record[field] as string).trim()) {
        throw validationError(`--tag-filters item ${index + 1} requires non-empty ${field}`);
      }
    }

    const inferenceType = String(record.inferenceType);
    const calcuSymbol = String(record.calcuSymbol);
    if (inferenceType !== 'label' && inferenceType !== 'score') {
      throw validationError(
        `--tag-filters item ${index + 1} inferenceType must be label or score`,
        'Use inferenceType from +get_corpus_tags; extract tags are not filterable by search_posts.',
      );
    }

    const allowedSymbols = inferenceType === 'label'
      ? ['C04', 'C05']
      : ['C00', 'C01', 'C02', 'C020', 'C03', 'C030', 'C04', 'C05', 'C06'];
    if (!allowedSymbols.includes(calcuSymbol)) {
      throw validationError(
        `--tag-filters item ${index + 1} calcuSymbol must be one of: ${allowedSymbols.join(', ')}`,
      );
    }

    if (inferenceType === 'score' && !['C04', 'C05'].includes(calcuSymbol)) {
      if (!Array.isArray(record.ftv)) {
        throw validationError(
          `--tag-filters item ${index + 1} ftv must be an array for score comparison ${calcuSymbol}`,
        );
      }
      const requiredValues = calcuSymbol === 'C06' ? 2 : 1;
      if (record.ftv.length < requiredValues) {
        throw validationError(
          `--tag-filters item ${index + 1} ftv requires at least ${requiredValues} value${requiredValues === 1 ? '' : 's'}`,
        );
      }
    }
  });
}

function parseDate(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return validatedUtc(Number(match[1]), Number(match[2]), Number(match[3]), 0, 0, 0);
}

function parseDateTime(value: string, minuteOnly: boolean): number | undefined {
  const pattern = minuteOnly
    ? /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
    : /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
  const match = pattern.exec(value);
  if (!match) return undefined;
  return validatedUtc(
    Number(match[1]), Number(match[2]), Number(match[3]),
    Number(match[4]), Number(match[5]), Number(match[6] ?? 0),
  );
}

function validatedUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): number | undefined {
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (value.getUTCFullYear() !== year
    || value.getUTCMonth() !== month - 1
    || value.getUTCDate() !== day
    || value.getUTCHours() !== hour
    || value.getUTCMinutes() !== minute
    || value.getUTCSeconds() !== second) return undefined;
  return value.getTime();
}

function temporalValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return parseDate(trimmed) ?? parseDateTime(trimmed, false);
}

function validationError(message: string, hint?: string): CliValidationError {
  return new CliValidationError(message, hint ? { hint } : undefined);
}
