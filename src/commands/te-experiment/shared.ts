import type { Command, DryRunResult, Flag, RiskLevel, RuntimeContext } from '../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../core/mcp.js';

export const EXPERIMENT_CLI_SERVICE = 'experiment';
export const EXPERIMENT_MCP_SERVICE = 'experiment';

export const PROJECT_ID_FLAG: Flag = {
  name: 'project_id',
  type: 'number',
  required: true,
  alias: 'p',
  desc: 'Project ID',
};

interface ExperimentCommandConfig {
  command: `+${string}`;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  buildArgs: (ctx: RuntimeContext) => Record<string, any>;
  validate?: (ctx: RuntimeContext) => void;
  toolName?: string;
  mcpService?: string;
}

export function createExperimentCommand(config: ExperimentCommandConfig): Command {
  const mcpService = config.mcpService || EXPERIMENT_MCP_SERVICE;
  const toolName = config.toolName || config.command.slice(1);
  return {
    service: EXPERIMENT_CLI_SERVICE,
    command: config.command,
    description: config.description,
    flags: config.flags,
    risk: config.risk,
    validate: config.validate,
    dryRun: (ctx) => buildMcpDryRun(ctx, mcpService, toolName, config.buildArgs(ctx)),
    execute: async (ctx) => executeMcpCommand(ctx, mcpService, toolName, config.buildArgs(ctx)),
  };
}

export function buildMcpDryRun(
  ctx: RuntimeContext,
  serviceName: string,
  toolName: string,
  args: Record<string, any>
): DryRunResult {
  const host = ctx.host();
  return {
    method: 'MCP tools/call',
    url: resolveMcpUrl(ctx.mcpUrl(), host, serviceName),
    body: {
      serviceName,
      toolName,
      arguments: args,
    },
  };
}

export async function executeMcpCommand(
  ctx: RuntimeContext,
  serviceName: string,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  const host = ctx.host();
  const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, serviceName);
  const result = await callMcpTool(mcpUrl, toolName, args, host);
  return parseMcpResult(result);
}

export function reqFlag(desc: string): Flag {
  return { name: 'req', type: 'json', required: true, desc };
}

export function hasFlag(ctx: RuntimeContext, name: string): boolean {
  return ctx.str(name) !== '';
}

export function readOptionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
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

export function readRequiredStringArray(ctx: RuntimeContext, name: string): string[] {
  const value = readRequiredJsonArray(ctx, name);
  if (!value.every((item) => typeof item === 'string' && item.length > 0)) {
    throw new Error(`Flag --${name} must be a JSON array of non-empty strings`);
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

export function projectArgs(ctx: RuntimeContext): Record<string, any> {
  return { projectId: ctx.num('project_id') };
}

export function projectReqArgs(ctx: RuntimeContext): Record<string, any> {
  const projectId = ctx.num('project_id');
  return {
    projectId,
    req: {
      ...readRequiredJsonObject(ctx, 'req'),
      projectId,
    },
  };
}

export function addOptionalString(
  args: Record<string, any>,
  ctx: RuntimeContext,
  flagName: string,
  argName: string
): void {
  const value = readOptionalString(ctx, flagName);
  if (value !== undefined) args[argName] = value;
}

export function addOptionalBoolean(
  args: Record<string, any>,
  ctx: RuntimeContext,
  flagName: string,
  argName: string
): void {
  const value = readOptionalBoolean(ctx, flagName);
  if (value !== undefined) args[argName] = value;
}

export function requireAllowedValue(value: string, allowed: string[], flagName: string): void {
  if (!allowed.includes(value)) {
    throw new Error(`Flag --${flagName} must be one of: ${allowed.join(', ')}`);
  }
}
