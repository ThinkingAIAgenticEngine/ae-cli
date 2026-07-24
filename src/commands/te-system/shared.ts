import { readFileSync } from 'node:fs';

import type { Command, Flag, RiskLevel, RuntimeContext } from '../../framework/types.js';
import {
  deleteFromMainApp,
  getFromMainApp,
  patchToMainApp,
  postToMainApp,
  putToMainApp,
  uploadToMainApp,
} from '../../core/te-agent-client.js';
import { CliValidationError } from '../../core/errors.js';
import { safeJsonParse } from '../../core/json-utils.js';

export type AdminMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface AdminRequest {
  method: AdminMethod;
  path: string;
  body?: unknown;
}

interface AdminCommandConfig {
  command: string;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  prepare(ctx: RuntimeContext): AdminRequest;
  redactDryRun?: boolean;
  validate?: (ctx: RuntimeContext) => void;
  helpText?: string;
}

const SECRET_KEYS = new Set([
  'appsecret',
  'bottoken',
  'apptoken',
  'clientsecret',
  'apikey',
  'secret',
  'token',
]);

export function assertAdminPath(path: string): void {
  if (path === '/api/admin' || path.startsWith('/api/admin/')) return;
  throw new CliValidationError('System commands may only call /api/admin endpoints');
}

export async function getAdmin<T = unknown>(
  path: string,
  host: string,
): Promise<T> {
  assertAdminPath(path);
  return getFromMainApp<T>(path, host);
}

export async function uploadAdminForm<T = unknown>(
  path: string,
  formData: FormData,
  host: string,
): Promise<T> {
  assertAdminPath(path);
  return uploadToMainApp<T>(path, formData, host);
}

async function executeAdminRequest(ctx: RuntimeContext, request: AdminRequest): Promise<unknown> {
  assertAdminPath(request.path);
  const host = ctx.host();
  switch (request.method) {
    case 'GET':
      return getFromMainApp(request.path, host);
    case 'POST':
      return postToMainApp(request.path, request.body ?? {}, host);
    case 'PATCH':
      return patchToMainApp(request.path, request.body ?? {}, host);
    case 'PUT':
      return putToMainApp(request.path, request.body ?? {}, host);
    case 'DELETE':
      return deleteFromMainApp(request.path, host);
  }
}

export function createAdminCommand(config: AdminCommandConfig): Command {
  return {
    service: 'system',
    command: config.command,
    description: config.description,
    flags: config.flags,
    risk: config.risk,
    helpText: config.helpText,
    validate: config.validate,
    preflight: config.risk === 'high-risk-write'
      ? (ctx) => {
          const request = config.prepare(ctx);
          assertAdminPath(request.path);
        }
      : undefined,
    dryRun: (ctx) => {
      const request = config.prepare(ctx);
      assertAdminPath(request.path);
      return {
        method: request.method,
        url: request.path,
        ...(request.body === undefined
          ? {}
          : { body: config.redactDryRun ? redactSecrets(request.body) : request.body }),
      };
    },
    execute: async (ctx) => executeAdminRequest(ctx, config.prepare(ctx)),
  };
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value || undefined;
}

export function assertEnum(
  flagName: string,
  value: string | undefined,
  values: readonly string[],
): void {
  if (!value || values.includes(value)) return;
  throw new CliValidationError(`--${flagName} must be one of: ${values.join(', ')}`);
}

export function withQuery(
  path: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}

function readJsonSource(raw: string, flagName: string): string {
  if (raw === '-') {
    return readFileSync(0, 'utf8');
  }
  if (raw.startsWith('@')) {
    const filePath = raw.slice(1).trim();
    if (!filePath) {
      throw new CliValidationError(`--${flagName} @file path cannot be empty`);
    }
    try {
      return readFileSync(filePath, 'utf8');
    } catch {
      throw new CliValidationError(`Unable to read JSON file for --${flagName}`, {
        hint: 'Check that the file exists and is readable.',
      });
    }
  }
  return raw;
}

export function readJsonFlag(ctx: RuntimeContext, name: string): unknown {
  const raw = ctx.str(name);
  try {
    return safeJsonParse(readJsonSource(raw, name));
  } catch (error) {
    if (error instanceof CliValidationError) throw error;
    throw new CliValidationError(`--${name} must be valid JSON`, {
      hint: `Pass inline JSON, @file, or - for stdin.`,
    });
  }
}

export function requireJsonObject(ctx: RuntimeContext, name: string): Record<string, unknown> {
  const value = readJsonFlag(ctx, name);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliValidationError(`--${name} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function requireJsonArray(ctx: RuntimeContext, name: string): unknown[] {
  const value = readJsonFlag(ctx, name);
  if (!Array.isArray(value)) {
    throw new CliValidationError(`--${name} must be a JSON array`);
  }
  return value;
}

export function requireStringArray(ctx: RuntimeContext, name: string): string[] {
  const value = requireJsonArray(ctx, name);
  if (value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new CliValidationError(`--${name} must be a non-empty JSON array of strings`);
  }
  return value as string[];
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEYS.has(key.toLowerCase()) ? '***' : redactSecrets(item),
    ]),
  );
}

export function encodeId(value: string): string {
  return encodeURIComponent(value);
}
