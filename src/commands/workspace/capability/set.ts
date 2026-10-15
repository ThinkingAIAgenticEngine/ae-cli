import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { assertOneOf, optional, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

const CAPABILITY_TYPES = ['agent', 'mcp', 'skill', 'knowledge_base'] as const;

function requireRevision(ctx: RuntimeContext): number {
  const version = ctx.num('version');
  if (!Number.isInteger(version) || version < 0) throw new CliValidationError('--version must be a non-negative integer');
  return version;
}

function requireSelectedIds(ctx: RuntimeContext): string[] {
  const value: unknown = ctx.json('selectedIds');
  if (!Array.isArray(value) || value.length > 100) {
    throw new CliValidationError('--selected-ids must be a JSON array with at most 100 items');
  }
  const ids = value.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new CliValidationError(`--selected-ids item ${index + 1} must be a non-empty string`);
    }
    return item.trim();
  });
  return [...new Set(ids)];
}

function capabilityBody(ctx: RuntimeContext) {
  return {
    revision: requireRevision(ctx),
    capabilityType: ctx.str('capabilityType'),
    selectedIds: requireSelectedIds(ctx),
    ...(optional(ctx, 'defaultAgentId') ? { defaultAgentId: optional(ctx, 'defaultAgentId') } : {}),
    operationSource: 'ae_cli',
  };
}

export const setWorkspaceCapabilities: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'capability',
  command: 'set',
  description: 'Replace one AgentSpace capability selection using optimistic concurrency',
  flags: [
    ...workspaceTargetFlags,
    { name: 'version', type: 'number', required: true, desc: 'Capability revision returned by workspace capability list' },
    { name: 'capability-type', type: 'string', required: true, desc: 'agent | mcp | skill | knowledge_base' },
    { name: 'selected-ids', type: 'json', required: true, desc: 'JSON array of selected capability IDs; [] clears the type' },
    { name: 'default-agent-id', type: 'string', required: false, desc: 'Default Agent ID when setting Agent capabilities' },
  ],
  risk: 'high-risk-write',
  preflight: (ctx) => { capabilityBody(ctx); },
  validate: (ctx) => {
    assertOneOf('capability-type', ctx.str('capabilityType'), CAPABILITY_TYPES);
    capabilityBody(ctx);
  },
  dryRun: (ctx) => targetDryRun(ctx, 'PUT', '/capabilities', capabilityBody(ctx)),
  execute: (ctx) => targetCall(ctx, 'PUT', '/capabilities', capabilityBody(ctx)),
};
