import { CliValidationError } from '../../core/errors.js';
import { executeCapabilityWithEnvelope } from '../../core/capability-api.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig,
} from '../../core/capability-command.js';
import type { RuntimeContext } from '../../framework/types.js';

type AiMonitorCapabilityCommandConfig = Omit<
  CreateCapabilityCommandConfig,
  'cliService' | 'gatewayDomain'
>;

export function createAiMonitorCapabilityCommand(config: AiMonitorCapabilityCommandConfig) {
  return createCapabilityCommandCore({
    ...config,
    cliService: 'ai-monitor',
    gatewayDomain: 'ai-monitor',
  });
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value || undefined;
}

/** Resolve user-facing Agent platform/environment flags while retaining raw flag compatibility. */
export function scopeValue(
  ctx: RuntimeContext,
  friendlyName: string,
  rawName: string,
  fallback: string,
): string {
  // Keep an explicitly supplied empty value intact so the existing command
  // validation/gateway error is preserved. Commander defaults are intentionally
  // omitted from the raw flags; the fallback is applied only when absent.
  if (ctx.has?.(friendlyName)) return ctx.str(friendlyName);
  if (ctx.has?.(rawName)) return ctx.str(rawName);
  return fallback;
}

type PlatformChoice = {
  platform_id: string;
  platform_name: string;
  environments: Array<{ environment_id: string; environment_name: string }>;
};

/** Resolve display names and discover a single default scope before trace execution. */
export async function prepareAiMonitorScope(
  ctx: RuntimeContext,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const hasPlatform = Boolean(ctx.has?.('platform'));
  const hasEnvironment = Boolean(ctx.has?.('environment'));
  const hasRawToken = Boolean(ctx.has?.('data-token'));
  const hasRawSource = Boolean(ctx.has?.('report-source'));
  if ((hasPlatform || hasEnvironment) && (hasRawToken || hasRawSource)) {
    throw new CliValidationError('Use either the friendly scope flags or the advanced compatibility flags, not both.', {
      code: 'CONFLICTING_AI_MONITOR_SCOPE_FLAGS',
    });
  }
  if (hasRawToken || hasRawSource) return input;
  // When both friendly scope values are explicit, let the gateway resolve them
  // in the same request. This avoids a redundant platform discovery round trip;
  // the gateway still validates ambiguity and availability authoritatively.
  if (hasPlatform && hasEnvironment) return input;

  const result = await executeCapabilityWithEnvelope(
    ctx.host(),
    'ai-monitor',
    'ai_monitor.platform.list',
    {},
  );
  const choices = Array.isArray((result.data as { items?: unknown })?.items)
    ? (result.data as { items: PlatformChoice[] }).items
    : [];

  const match = (value: string, candidates: PlatformChoice[], kind: 'platform' | 'environment') => {
    const normalized = value.trim().toLowerCase();
    const matches = kind === 'platform'
      ? candidates.filter((item) => item.platform_id.toLowerCase() === normalized || item.platform_name.trim().toLowerCase() === normalized)
      : candidates;
    if (matches.length > 1) {
      throw new CliValidationError(`Ambiguous ${kind} '${value}'.`, { code: 'AMBIGUOUS_AI_MONITOR_SCOPE', hint: 'Use the id shown by: ai-monitor platform list' });
    }
    return matches[0];
  };

  let platform: PlatformChoice | undefined;
  if (hasPlatform) {
    platform = match(ctx.str('platform'), choices, 'platform');
    if (!platform) throw new CliValidationError(`Unknown Agent platform '${ctx.str('platform')}'.`, { code: 'INVALID_AI_MONITOR_PLATFORM', hint: 'Run: ai-monitor platform list' });
  } else if (choices.length === 1) {
    platform = choices[0];
  } else if (choices.length === 0) {
    throw new CliValidationError('No Agent platform is available for the current account.', {
      code: 'AI_MONITOR_SCOPE_UNAVAILABLE',
      hint: 'Check the AI Monitor platform configuration or contact an administrator.',
    });
  }

  if (hasEnvironment) {
    const candidates = platform ? [platform] : choices;
    const environmentMatches = candidates.flatMap((item) => item.environments
      .filter((environment) => environment.environment_id.toLowerCase() === ctx.str('environment').trim().toLowerCase()
        || environment.environment_name.trim().toLowerCase() === ctx.str('environment').trim().toLowerCase())
      .map((environment) => ({ platform: item, environment })));
    if (environmentMatches.length !== 1) {
      throw new CliValidationError(
        environmentMatches.length > 1 ? `Ambiguous runtime environment '${ctx.str('environment')}'.` : `Unknown runtime environment '${ctx.str('environment')}'.`,
        { code: 'INVALID_AI_MONITOR_ENVIRONMENT', hint: 'Run: ai-monitor platform list' },
      );
    }
    platform = environmentMatches[0].platform;
    return { ...input, data_token: platform.platform_id, report_source: environmentMatches[0].environment.environment_id };
  }

  if (!platform) {
    throw new CliValidationError('Multiple Agent platforms are available; choose one.', {
      code: 'AI_MONITOR_SCOPE_REQUIRED',
      hint: 'Run: ai-monitor platform list, then pass --platform and optionally --environment.',
    });
  }
  if (platform.environments.length === 0) {
    throw new CliValidationError(`No runtime environment is available for '${platform.platform_name}'.`, {
      code: 'AI_MONITOR_ENVIRONMENT_UNAVAILABLE',
      hint: 'Run: ai-monitor platform list',
    });
  }
  if (platform.environments.length !== 1) {
    throw new CliValidationError(`Multiple runtime environments are available for '${platform.platform_name}'.`, {
      code: 'AI_MONITOR_ENVIRONMENT_REQUIRED',
      hint: 'Pass --environment using a value from: ai-monitor platform list',
    });
  }
  return { ...input, data_token: platform.platform_id, report_source: platform.environments[0].environment_id };
}

export function validateDateRange(ctx: RuntimeContext): void {
  const start = optionalString(ctx, 'start-date');
  const end = optionalString(ctx, 'end-date');
  if ((start === undefined) !== (end === undefined)) {
    throw new CliValidationError('--start-date and --end-date must be provided together.', {
      code: 'INVALID_DATE_RANGE',
    });
  }
  if (start && end && start > end) {
    throw new CliValidationError('--start-date must not be later than --end-date.', {
      code: 'INVALID_DATE_RANGE',
    });
  }
}

export function normalizedSortBy(ctx: RuntimeContext): string {
  const value = ctx.str('sort-by');
  const values: Record<string, string> = {
    'start-time': 'start_time',
    'end-time': 'end_time',
    duration: 'duration',
    'total-tokens': 'total_tokens',
    'span-count': 'span_count',
    'error-span-count': 'error_span_count',
    'recorded-costs': 'recorded_costs',
  };
  const normalized = values[value];
  if (!normalized) {
    throw new CliValidationError('--sort-by has an unsupported value.', {
      code: 'INVALID_SORT_FIELD',
      hint: `Use one of: ${Object.keys(values).join(', ')}.`,
    });
  }
  return normalized;
}

export function normalizedSortOrder(ctx: RuntimeContext): 'asc' | 'desc' {
  const value = ctx.str('sort-order');
  if (value !== 'asc' && value !== 'desc') {
    throw new CliValidationError('--sort-order must be asc or desc.', {
      code: 'INVALID_SORT_ORDER',
    });
  }
  return value;
}
