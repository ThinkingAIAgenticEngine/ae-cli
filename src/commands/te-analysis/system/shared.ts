import { readFileSync, statSync } from 'node:fs';
import type { Command, Flag, RiskLevel, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';

export type SystemFieldType = 'string' | 'number' | 'boolean' | 'json';

export interface SystemField {
  flag: string;
  input?: string;
  type: SystemFieldType;
  required?: boolean;
  desc: string;
  min?: number;
  max?: number;
  pattern?: string;
  allowed?: readonly (string | number)[];
  array?: boolean;
}

export interface SystemSecretField {
  input: string;
  flag: string;
  desc: string;
  required?: boolean;
  transform?: (value: string) => string;
}

export interface SystemCommandSpec {
  resource: string;
  command: string;
  capabilityId: string;
  description: string;
  risk: RiskLevel;
  fields?: readonly SystemField[];
  secrets?: readonly SystemSecretField[];
  validate?: (ctx: RuntimeContext, input: Record<string, unknown>) => void;
}

const secretValues = new WeakMap<RuntimeContext, Map<string, string | undefined>>();

export const companyIdField: SystemField = {
  flag: 'company-id',
  input: 'company_id',
  type: 'number',
  required: true,
  min: 1,
  desc: 'Company ID.',
};

export const queryField: SystemField = {
  flag: 'query',
  type: 'string',
  desc: 'Optional keyword filter.',
};

export const limitField: SystemField = {
  flag: 'limit',
  type: 'number',
  min: 1,
  max: 200,
  desc: 'Page size. Default and maximum depend on the capability schema.',
};

export const offsetField: SystemField = {
  flag: 'offset',
  type: 'number',
  min: 0,
  desc: 'Zero-based result offset.',
};

export const fieldsField: SystemField = {
  flag: 'fields',
  type: 'json',
  array: true,
  desc: 'Optional snake_case result field projection JSON array.',
};

export function defineSystemCommand(spec: SystemCommandSpec): Command {
  const fields = [companyIdField, ...(spec.fields ?? [])];
  const secrets = spec.secrets ?? [];
  return createAnalysisCapabilityCommand({
    resource: `system ${spec.resource}`,
    command: spec.command,
    capabilityId: spec.capabilityId,
    description: spec.description,
    flags: [
      ...fields.map(fieldFlag),
      ...secrets.flatMap(secretFlags),
    ],
    risk: spec.risk,
    validate: (ctx) => {
      validateSecretSources(ctx, secrets);
      const input = buildSystemInput(ctx, fields, [], spec.risk);
      for (const secret of secrets) {
        if (ctx.str(`${secret.flag}-file`) || ctx.bool(`${secret.flag}-stdin`)) {
          input[secret.input] = '<provided>';
        }
      }
      validateFields(fields, input);
      spec.validate?.(ctx, input);
    },
    buildInput: (ctx) => {
      const input = buildSystemInput(ctx, fields, secrets, spec.risk);
      validateFields(fields, input);
      validateSecretSources(ctx, secrets);
      spec.validate?.(ctx, input);
      return input;
    },
  });
}

function fieldFlag(field: SystemField): Flag {
  return {
    name: field.flag,
    type: field.type,
    required: field.required,
    desc: field.desc,
    min: field.min,
    max: field.max,
    pattern: field.pattern,
  };
}

function secretFlags(secret: SystemSecretField): Flag[] {
  const requirement = secret.required
    ? ` One of --${secret.flag}-file or --${secret.flag}-stdin is required.`
    : '';
  return [
    {
      name: `${secret.flag}-file`,
      type: 'string',
      required: false,
      desc: `${secret.desc} Read from a local permission-protected file; the value is never accepted directly on argv.${requirement}`,
    },
    {
      name: `${secret.flag}-stdin`,
      type: 'boolean',
      required: false,
      sensitive: true,
      desc: `${secret.desc} Read from stdin; do not combine with --${secret.flag}-file.${requirement}`,
    },
  ];
}

function buildSystemInput(
  ctx: RuntimeContext,
  fields: readonly SystemField[],
  secrets: readonly SystemSecretField[],
  risk: RiskLevel,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const value = fieldValue(ctx, field);
    if (value !== undefined) input[field.input ?? kebabToSnake(field.flag)] = value;
  }
  for (const secret of secrets) {
    const value = secretValue(ctx, secret);
    if (value !== undefined) input[secret.input] = secret.transform ? secret.transform(value) : value;
  }
  if (risk === 'high-risk-write') input.yes = true;
  return compactInput(input);
}

function fieldValue(ctx: RuntimeContext, field: SystemField): unknown {
  const raw = ctx.str(field.flag);
  if (raw === '') return undefined;
  if (field.type === 'string') return raw;
  if (field.type === 'number') return Number(raw);
  if (field.type === 'boolean') return ctx.bool(field.flag);
  return ctx.json(field.flag);
}

function validateFields(fields: readonly SystemField[], input: Record<string, unknown>): void {
  for (const field of fields) {
    const inputName = field.input ?? kebabToSnake(field.flag);
    const value = input[inputName];
    if (field.required && value === undefined) {
      throw validation(`--${field.flag} is required.`);
    }
    if (value === undefined) continue;
    if (field.array && !Array.isArray(value)) {
      throw validation(`--${field.flag} must be a JSON array.`);
    }
    if (field.allowed && !field.allowed.includes(value as never)) {
      throw validation(`--${field.flag} must be one of: ${field.allowed.join(', ')}.`);
    }
  }
}

function validateSecretSources(ctx: RuntimeContext, secrets: readonly SystemSecretField[]): void {
  let stdinSources = 0;
  for (const secret of secrets) {
    const file = ctx.str(`${secret.flag}-file`);
    const stdin = ctx.bool(`${secret.flag}-stdin`);
    if (file && stdin) {
      throw validation(`Use only one of --${secret.flag}-file and --${secret.flag}-stdin.`);
    }
    if (secret.required && !file && !stdin) {
      throw validation(`Provide --${secret.flag}-file or --${secret.flag}-stdin.`);
    }
    if (stdin) stdinSources += 1;
  }
  if (stdinSources > 1) {
    throw validation('Only one secret value may be read from stdin in a single invocation; use protected files for the others.');
  }
}

function secretValue(ctx: RuntimeContext, secret: SystemSecretField): string | undefined {
  let values = secretValues.get(ctx);
  if (!values) {
    values = new Map();
    secretValues.set(ctx, values);
  }
  if (values.has(secret.flag)) {
    return values.get(secret.flag);
  }

  let value: string | undefined;
  const file = ctx.str(`${secret.flag}-file`);
  if (file) {
    const stat = statSync(file);
    if (!stat.isFile()) throw validation(`--${secret.flag}-file must reference a regular file.`);
    if ((stat.mode & 0o077) !== 0) {
      throw validation(`--${secret.flag}-file must not be readable or writable by group/others (use chmod 600).`);
    }
    value = nonEmptySecret(readFileSync(file, 'utf8'), secret.flag);
  } else if (ctx.bool(`${secret.flag}-stdin`)) {
    value = nonEmptySecret(readFileSync(0, 'utf8'), secret.flag);
  }
  values.set(secret.flag, value);
  return value;
}

function nonEmptySecret(value: string, flag: string): string {
  const normalized = value.replace(/\r?\n$/, '');
  if (normalized.length === 0) throw validation(`Secret input for --${flag} must not be empty.`);
  return normalized;
}

export function requireAtLeastOne(
  input: Record<string, unknown>,
  names: readonly string[],
  message: string,
): void {
  const present = names.some((name) => {
    const value = input[name];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '';
  });
  if (!present) throw validation(message);
}

export function requireArrayObjects(
  input: Record<string, unknown>,
  name: string,
  requiredKeys: readonly string[],
): void {
  const value = input[name];
  if (value === undefined) return;
  if (!Array.isArray(value)) throw validation(`${snakeToFlag(name)} must be a JSON array.`);
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw validation(`${snakeToFlag(name)} item ${index + 1} must be an object.`);
    }
    for (const key of requiredKeys) {
      if (!(key in item)) {
        throw validation(`${snakeToFlag(name)} item ${index + 1} is missing ${key}.`);
      }
    }
  });
}

export function validation(message: string): CliValidationError {
  return new CliValidationError(message, { code: 'INVALID_SYSTEM_CAPABILITY_INPUT' });
}

function kebabToSnake(value: string): string {
  return value.replaceAll('-', '_');
}

function snakeToFlag(value: string): string {
  return `--${value.replaceAll('_', '-')}`;
}
