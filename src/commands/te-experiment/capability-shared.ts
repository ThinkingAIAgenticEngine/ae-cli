import type { RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig,
} from '../../core/capability-command.js';

type ExperimentCapabilityCommandConfig = Omit<CreateCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

/** Creates an Experiment capability gateway command. */
export function createExperimentCapabilityCommand(config: ExperimentCapabilityCommandConfig) {
  return createCapabilityCommandCore({
    ...config,
    cliService: 'experiment',
    gatewayDomain: 'engage',
  });
}

/** Reads an exact positive integer without silently rounding resource IDs. */
export function readPositiveInteger(ctx: RuntimeContext, name: string): number {
  const raw = ctx.str(name).trim();
  if (!/^[0-9]+$/.test(raw)) {
    throw new CliValidationError(`Flag --${name} must be a positive safe integer written as decimal digits`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new CliValidationError(`Flag --${name} must be a positive safe integer`);
  }
  return value;
}

/** Reads a non-empty string using the approval gateway's trimming semantics. */
export function readNonEmptyString(ctx: RuntimeContext, name: string): string {
  const value = ctx.str(name).trim();
  if (!value) throw new CliValidationError(`Flag --${name} must be a non-empty string`);
  return value;
}

/** Reads a required JSON object flag. */
export function readRequiredObject(ctx: RuntimeContext, name: string): Record<string, unknown> {
  const value = ctx.json(name);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Flag --${name} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

/** Reads a required non-empty string array flag. */
export function readRequiredStringArray(ctx: RuntimeContext, name: string): string[] {
  const value = ctx.json(name);
  if (!Array.isArray(value) || value.length === 0
      || !value.every((item) => typeof item === 'string' && item.length > 0)) {
    throw new Error(`Flag --${name} must be a non-empty JSON array of strings`);
  }
  return value;
}

/** Adds a non-empty optional string to a capability input. */
export function addOptionalString(
  input: Record<string, unknown>,
  name: string,
  value: string,
): void {
  if (value !== '') input[name] = value;
}

/** Adds an optional boolean when its flag is present. */
export function addOptionalBoolean(
  input: Record<string, unknown>,
  ctx: RuntimeContext,
  flagName: string,
  fieldName: string,
): void {
  if (ctx.str(flagName) !== '') input[fieldName] = ctx.bool(flagName);
}
