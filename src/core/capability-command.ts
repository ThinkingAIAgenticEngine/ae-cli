import type { Command, Flag, RiskLevel, RuntimeContext } from '../framework/types.js';
import {
  buildCapabilityGatewayUrl,
  executeCapability,
} from './capability-api.js';
import { resolveGatewayDomain } from './capability-routing.js';

export interface CreateCapabilityCommandConfig {
  /** CLI 注册域，对应 ae-cli <service> */
  cliService: string;
  /** Resource segment, e.g. `event` → `ae-cli metadata event get`. */
  resource: string;
  /** Action name under the resource, e.g. `get`. */
  command: string;
  /** Gateway capability id, e.g. `metadata.event.get`. */
  capabilityId: string;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  /** Gateway 路由组件；省略时使用 registerCapabilityGatewayRoute(cliService) 默认值 */
  gatewayDomain?: string;
  validate?: (ctx: RuntimeContext) => void;
  buildInput: (ctx: RuntimeContext) => Record<string, unknown>;
}

export function createCapabilityCommand(config: CreateCapabilityCommandConfig): Command {
  return {
    service: config.cliService,
    resource: config.resource,
    command: config.command,
    description: config.description,
    flags: config.flags,
    risk: config.risk,
    validate: config.validate,
    dryRun: (ctx) => {
      const gatewayDomain = resolveGatewayDomain(config.cliService, config.gatewayDomain);
      const input = config.buildInput(ctx);
      return {
        method: 'POST',
        url: buildCapabilityGatewayUrl(
          ctx.host(),
          gatewayDomain,
          `capabilities/${config.capabilityId}/dry-run`,
        ),
        body: { input },
      };
    },
    execute: async (ctx) => {
      const gatewayDomain = resolveGatewayDomain(config.cliService, config.gatewayDomain);
      const input = config.buildInput(ctx);
      return executeCapability(ctx.host(), gatewayDomain, config.capabilityId, input);
    },
  };
}
