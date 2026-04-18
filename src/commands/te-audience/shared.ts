import type { Command, Flag, RiskLevel, RuntimeContext } from '../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../core/mcp.js';

interface CreateMcpCommandConfig {
  command: `+${string}`;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  mcpService?: string;
  buildArgs: (ctx: RuntimeContext) => Record<string, unknown>;
}

export function createMcpCommand(config: CreateMcpCommandConfig): Command {
  const toolName = config.command.slice(1);
  const mcpService = config.mcpService || 'te_analysis';

  return {
    service: 'te_audience',
    command: config.command,
    description: config.description,
    flags: config.flags,
    risk: config.risk,
    dryRun: (ctx) => ({
      method: 'tools/call',
      url: resolveMcpUrl(ctx.mcpUrl(), ctx.host(), mcpService),
      body: {
        name: toolName,
        arguments: config.buildArgs(ctx),
      },
    }),
    execute: async (ctx) => {
      const url = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), mcpService);
      const result = await callMcpTool(url, toolName, config.buildArgs(ctx), ctx.host());
      return parseMcpResult(result);
    },
  };
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function optionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : Number(value);
}

export function optionalBoolean(ctx: RuntimeContext, name: string): boolean | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.bool(name);
}

export function optionalJson(ctx: RuntimeContext, name: string): unknown | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.json(name);
}

export function optionalJsonString(ctx: RuntimeContext, name: string): string | undefined {
  const value = optionalJson(ctx, name);
  return value === undefined ? undefined : JSON.stringify(value);
}

export function requiredJsonString(ctx: RuntimeContext, name: string): string {
  return JSON.stringify(ctx.json(name));
}
