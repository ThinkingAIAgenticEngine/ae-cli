import { randomBytes } from 'node:crypto';
import { verifyDefinitionIntent, type DefinitionIntentConfig } from './definition-intent.js';
import type { Command, Flag, RiskLevel, RuntimeContext } from '../framework/types.js';
import {
  dryRunCapabilityWithEnvelope,
  executeCapabilityWithEnvelope,
  validateCapabilityWithEnvelope,
} from './capability-api.js';
import { resolveGatewayDomain } from './capability-routing.js';
import { withOutputMetadata } from '../framework/output.js';

export interface CreateCapabilityCommandConfig {
  /** CLI registration domain, corresponding to ae-cli <service>. */
  cliService: string;
  /** Resource segment, e.g. `event` → `ae-cli analysis-meta event get`. */
  resource: string;
  /** Action name under the resource, e.g. `get`. */
  command: string;
  /** Gateway capability id, e.g. `metadata.event.get`. */
  capabilityId: string;
  description: string;
  helpText?: string;
  flags: Flag[];
  risk: RiskLevel;
  /** Gateway routing segment; defaults to registerCapabilityGatewayRoute(cliService). */
  gatewayDomain?: string;
  /** Override request host for direct local service calls. */
  requestHost?: string;
  validate?: (ctx: RuntimeContext) => void;
  intentConsistency?: DefinitionIntentConfig;
  buildInput: (ctx: RuntimeContext) => Record<string, unknown>;
  /** Optional async input resolver for service-specific discovery (kept out of generic commands). */
  prepareInput?: (ctx: RuntimeContext, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  postProcess?: (
    result: unknown,
    input: Record<string, unknown>,
    ctx: RuntimeContext,
  ) => unknown | Promise<unknown>;
}

export function createCapabilityCommand(config: CreateCapabilityCommandConfig): Command {
  return {
    service: config.cliService,
    resource: config.resource,
    command: config.command,
    capabilityId: config.capabilityId,
    description: config.description,
    helpText: config.helpText,
    flags: config.flags,
    risk: config.risk,
    validate: config.validate || config.intentConsistency
      ? (ctx) => {
          config.validate?.(ctx);
          if (config.intentConsistency) verifyDefinitionIntent(ctx, config.intentConsistency);
        }
      : undefined,
    preflight: (ctx) => {
      // Force parsing of all flags (e.g. JSON arrays) so invalid input surfaces as a clean
      // validation error before the high-risk-write confirmation gate.
      config.buildInput(ctx);
    },
    validateInput: async (ctx) => {
      const gatewayDomain = resolveGatewayDomain(config.cliService, config.gatewayDomain);
      const requestHost = config.requestHost ?? ctx.host();
      const input = withLifecycleRequestId(config, config.buildInput(ctx));
      const preparedInput = config.prepareInput ? await config.prepareInput(ctx, input) : input;
      const evidence = config.intentConsistency ? verifyDefinitionIntent(ctx, config.intentConsistency) : undefined;
      const intentMeta = evidence ? { intent_consistency: evidence } : undefined;
      const result = await validateCapabilityWithEnvelope(requestHost, gatewayDomain, config.capabilityId, preparedInput);
      return withOutputMetadata(result.data, { ...result.meta, ...intentMeta });
    },
    dryRun: async (ctx) => {
      const gatewayDomain = resolveGatewayDomain(config.cliService, config.gatewayDomain);
      const requestHost = config.requestHost ?? ctx.host();
      const input = withLifecycleRequestId(config, config.buildInput(ctx));
      const preparedInput = config.prepareInput ? await config.prepareInput(ctx, input) : input;
      const evidence = config.intentConsistency ? verifyDefinitionIntent(ctx, config.intentConsistency) : undefined;
      const intentMeta = evidence ? { intent_consistency: evidence } : undefined;
      const result = await dryRunCapabilityWithEnvelope(requestHost, gatewayDomain, config.capabilityId, preparedInput);
      return withOutputMetadata(result.data, { ...result.meta, ...intentMeta });
    },
    execute: async (ctx) => {
      const gatewayDomain = resolveGatewayDomain(config.cliService, config.gatewayDomain);
      const requestHost = config.requestHost ?? ctx.host();
      const input = withLifecycleRequestId(config, config.buildInput(ctx));
      const preparedInput = config.prepareInput ? await config.prepareInput(ctx, input) : input;
      const evidence = config.intentConsistency ? verifyDefinitionIntent(ctx, config.intentConsistency) : undefined;
      const intentMeta = evidence ? { intent_consistency: evidence } : undefined;
      announceDispatch(config.capabilityId, preparedInput);
      const result = await executeCapabilityWithEnvelope(requestHost, gatewayDomain, config.capabilityId, preparedInput);
      const data = config.postProcess
        ? await config.postProcess(result.data, preparedInput, ctx)
        : result.data;
      return withOutputMetadata(data, { ...result.meta, ...intentMeta });
    },
  };
}

function withLifecycleRequestId(
  config: CreateCapabilityCommandConfig,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (!config.flags.some((flag) => flag.name === 'request-id')) {
    return input;
  }
  const supplied = input.request_id;
  const requestId = typeof supplied === 'string' && supplied.length > 0
    ? supplied
    : `cli_${randomBytes(16).toString('hex')}`;
  return { ...input, request_id: requestId };
}

function announceDispatch(capabilityId: string, input: Record<string, unknown>): void {
  if (typeof input.request_id !== 'string') {
    return;
  }
  process.stderr.write(
    `[ae-cli] dispatching capability=${capabilityId} request_id=${input.request_id}\n`,
  );
}
