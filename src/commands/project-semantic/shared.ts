import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RuntimeContext } from '../../framework/types.js';
import {
  createCapabilityCommand,
  type CreateCapabilityCommandConfig,
} from '../../core/capability-command.js';

type ProjectSemanticCommandConfig = Omit<CreateCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

export function createProjectSemanticCommand(config: ProjectSemanticCommandConfig) {
  return createCapabilityCommand({
    ...config,
    cliService: 'project-semantic',
    gatewayDomain: 'analysis',
  });
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function optionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  return ctx.optionalNum(name);
}

export function optionalJson(ctx: RuntimeContext, name: string): unknown | undefined {
  if (ctx.str(name) === '') {
    return undefined;
  }
  return ctx.json(name);
}

export function compactInput(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function readJsonFile(file: string, maxBytes = 1024 * 1024): unknown {
  const text = readFileSync(resolve(file), 'utf8');
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new Error(`JSON file must not exceed ${maxBytes} bytes.`);
  }
  return JSON.parse(text);
}

export function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a JSON array.`);
  }
  return value;
}
