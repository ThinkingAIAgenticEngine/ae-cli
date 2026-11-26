import {
  createCapabilityCommand,
  type CreateCapabilityCommandConfig,
} from '../../core/capability-command.js';
import type { Command, RuntimeContext } from '../../framework/types.js';

type PersonalSemanticPreferenceCommandConfig = Omit<CreateCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

export function createPersonalSemanticPreferenceCommand(config: PersonalSemanticPreferenceCommandConfig): Command {
  const projectCommand = createCapabilityCommand({
    ...config,
    cliService: 'personal-semantic-preference',
    gatewayDomain: 'analysis',
  });
  if (!['list', 'get', 'add', 'update', 'delete'].includes(config.command)) return projectCommand;
  const globalCommand = createCapabilityCommand({
    ...config,
    capabilityId: config.capabilityId.replace('.personal_context.', '.global_personal_context.'),
    cliService: 'personal-semantic-preference',
    gatewayDomain: 'analysis',
  });
  const scoped = (ctx: RuntimeContext) => ctx.num('project-id') === -1 ? globalCommand : projectCommand;
  return {
    ...projectCommand,
    validate: (ctx) => {
      if (config.command === 'get' && ctx.bool('include-expired') && ctx.bool('mark-used')) {
        throw new Error('--include-expired cannot be combined with --mark-used.');
      }
      const projectId = ctx.num('project-id');
      if (!Number.isSafeInteger(projectId) || (projectId !== -1 && projectId <= 0)) {
        throw new Error('--project-id must be a positive integer or -1 for global personal semantics.');
      }
      projectCommand.validate?.(ctx);
      if (projectId === -1 && ['add', 'update'].includes(config.command)) {
        const refs = optionalResourceRefs(ctx);
        if (refs?.some((ref) => ref.resource_type !== 'project')) {
          throw new Error('Global asset_context references must use resource_type=project and an authorized project ID.');
        }
      }
    },
    validateInput: (ctx) => scoped(ctx).validateInput!(ctx),
    dryRun: (ctx) => scoped(ctx).dryRun!(ctx),
    execute: (ctx) => scoped(ctx).execute(ctx),
  };
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function optionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  return ctx.optionalNum(name);
}

export function optionalJsonStringArray(ctx: RuntimeContext, name: string, flag: string): string[] | undefined {
  if (ctx.str(name) === '') {
    return undefined;
  }
  const value = ctx.json(name);
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${flag} must be a JSON array of strings.`);
  }
  return value;
}

export function optionalKeywords(ctx: RuntimeContext): string[] | undefined {
  return optionalJsonStringArray(ctx, 'keywords', '--keywords');
}

type ResourceRef = {
  resource_type: string;
  resource_key: string;
  display_name: string;
};

export function optionalResourceRefs(ctx: RuntimeContext): ResourceRef[] | undefined {
  if (ctx.str('resource-refs') === '') {
    return undefined;
  }
  const value = ctx.json('resource-refs');
  if (!Array.isArray(value)) {
    throw new Error('--resource-refs must be a JSON array.');
  }
  if (value.length > 50) {
    throw new Error('--resource-refs must contain at most 50 items.');
  }
  const identities = new Set<string>();
  return value.map((item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('--resource-refs items must be objects.');
    }
    const keys = Object.keys(item).sort();
    if (keys.join(',') !== 'display_name,resource_key,resource_type') {
      throw new Error('--resource-refs items must contain only resource_type, resource_key, and display_name.');
    }
    const ref = item as Record<string, unknown>;
    if (typeof ref.resource_type === 'string' && ref.resource_type.trim().toLowerCase() === 'virtual_property') {
      throw new Error('Virtual properties use resource_type=event_property or user_property and the canonical property name. Copy resource_type/resource_key from analysis-meta catalog list; do not use a virtual property ID.');
    }
    if (typeof ref.resource_type !== 'string'
      || !/^[a-z][a-z0-9_]{0,63}$/i.test(ref.resource_type.trim())) {
      throw new Error('resource_type must use lower snake_case.');
    }
    if (typeof ref.resource_key !== 'string' || ref.resource_key.trim().length === 0
      || ref.resource_key.trim().length > 255) {
      throw new Error('resource_key must contain 1 to 255 characters.');
    }
    if (typeof ref.display_name !== 'string' || ref.display_name.trim().length === 0
      || ref.display_name.trim().length > 255) {
      throw new Error('display_name must contain 1 to 255 characters.');
    }
    const normalized = {
      resource_type: ref.resource_type.trim().toLowerCase(),
      resource_key: ref.resource_key.trim(),
      display_name: ref.display_name.trim(),
    };
    const identity = `${normalized.resource_type}\u0000${normalized.resource_key}`;
    if (identities.has(identity)) {
      throw new Error('--resource-refs must contain unique resource_type and resource_key pairs.');
    }
    identities.add(identity);
    return normalized;
  });
}

export function validateContextType(ctx: RuntimeContext): void {
  const value = ctx.str('context-type');
  const supported = ['preference', 'business_rule', 'asset_context', 'experience', 'background'];
  if (!supported.includes(value)) {
    throw new Error(`--context-type must be one of: ${supported.join(', ')}.`);
  }
}

export function validatePersonalSemanticWrite(ctx: RuntimeContext): void {
  validateContextType(ctx);
  const contextType = ctx.str('context-type');
  const refs = optionalResourceRefs(ctx);
  if (contextType === 'asset_context' && (!refs || refs.length === 0)) {
    throw new Error('--resource-refs is required and must be non-empty for --context-type asset_context.');
  }
  if (contextType !== 'asset_context' && refs && refs.length > 0) {
    throw new Error('--resource-refs is only allowed with --context-type asset_context.');
  }
}

export function compactInput(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function optionalSources(ctx: RuntimeContext): Record<string, unknown>[] | undefined {
  if (ctx.str('sources') === '') return undefined;
  const value = ctx.json('sources');
  if (!Array.isArray(value) || value.length > 200 || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('--sources must be a JSON array of at most 200 source objects.');
  }
  return value;
}
