import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { currentAgentSpaceId } from '../../core/agent-space-context.js';
import { CliValidationError } from '../../core/errors.js';
import { buildMemoryCliUrl, getMemoryCli, patchMemoryCli, postMemoryCli } from './cli-client.js';

export const MEMORY_SERVICE = 'memory';
export const MEMORY_STATUSES = ['active', 'deleted'];
export const CANDIDATE_VIEWS = ['mine', 'pending'];
export const CANDIDATE_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn', 'conflicted'];

export function optional(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value || undefined;
}

function envOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function assertOneOf(flag: string, value: string | undefined, allowed: string[]): void {
  if (value && !allowed.includes(value)) {
    throw new Error(`--${flag} must be one of: ${allowed.join(', ')}`);
  }
}

export function version(ctx: RuntimeContext): number {
  const value = ctx.num('version');
  if (!Number.isInteger(value) || value < 1) throw new Error('--version must be a positive integer');
  return value;
}

export function conversationId(ctx: RuntimeContext): string | undefined {
  return optional(ctx, 'conversationId') ?? envOptional('TE_AGENT_CONVERSATION_ID');
}

export function agentId(ctx: RuntimeContext): string {
  const value = optional(ctx, 'agentId') ?? envOptional('TE_AGENT_CURRENT_AGENT_ID');
  if (!value) throw new Error('--agent-id is required outside an Agent conversation');
  return value;
}

function targetQuery(ctx: RuntimeContext): string {
  const workspaceId = optional(ctx, 'workspaceId') ?? currentAgentSpaceId();
  const currentConversationId = conversationId(ctx);
  if (!workspaceId && !currentConversationId) {
    throw new Error(
      'Memory target is required. Provide --workspace-id or --conversation-id, or run inside an AgentSpace conversation.',
    );
  }
  return query({ agentSpaceId: workspaceId, conversationId: currentConversationId });
}

function targetPath(ctx: RuntimeContext): string {
  return `target${targetQuery(ctx)}`;
}

type MemoryTarget = {
  agentSpaceId: string;
  spaceType: 'personal' | 'shared';
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  capabilities?: Record<string, boolean>;
};

export async function resolveMemoryTarget(ctx: RuntimeContext): Promise<MemoryTarget> {
  return getMemoryCli<MemoryTarget>(ctx, targetPath(ctx));
}

function resourcePath(agentSpaceId: string, suffix: string): string {
  return `agent-spaces/${encodeURIComponent(agentSpaceId)}/${suffix.replace(/^\/+/, '')}`;
}

function previewResourcePath(ctx: RuntimeContext, suffix: string): string {
  const id = optional(ctx, 'workspaceId') ?? currentAgentSpaceId() ?? ':resolved-workspace-id';
  return resourcePath(id, suffix);
}

export function targetDryRun(ctx: RuntimeContext, method: string, suffix: string, body?: unknown) {
  return {
    method,
    url: buildMemoryCliUrl(ctx, previewResourcePath(ctx, suffix)),
    params: { target_url: buildMemoryCliUrl(ctx, targetPath(ctx)) },
    ...(body === undefined ? {} : { body }),
  };
}

export async function targetGet<T>(ctx: RuntimeContext, suffix: string): Promise<T> {
  const target = await resolveMemoryTarget(ctx);
  return getMemoryCli<T>(ctx, resourcePath(target.agentSpaceId, suffix));
}

export async function targetPost<T>(ctx: RuntimeContext, suffix: string, body: unknown): Promise<T> {
  const target = await resolveMemoryTarget(ctx);
  return postMemoryCli<T>(ctx, resourcePath(target.agentSpaceId, suffix), body);
}

export async function targetPatch<T>(ctx: RuntimeContext, suffix: string, body: unknown): Promise<T> {
  const target = await resolveMemoryTarget(ctx);
  return patchMemoryCli<T>(ctx, resourcePath(target.agentSpaceId, suffix), body);
}

export const targetFlags: Flag[] = [
  { name: 'workspace-id', type: 'string', required: false, desc: 'AgentSpace ID; defaults to the current AgentSpace or resolves from the current conversation' },
  { name: 'conversation-id', type: 'string', required: false, desc: 'Conversation ID used to verify or resolve the AgentSpace target' },
];

export function memoryBody(ctx: RuntimeContext) {
  return compact({ title: optional(ctx, 'title'), content: ctx.str('content'), scopeType: 'space', agentId: null, conversationId: conversationId(ctx) });
}

export function memoryMutationBody(ctx: RuntimeContext) {
  return compact({ title: optional(ctx, 'title'), content: ctx.str('content'), scopeType: 'space', agentId: null, version: version(ctx), conversationId: conversationId(ctx) });
}

export function memoryStateCommand(action: 'pin' | 'unpin' | 'delete' | 'restore'): Command {
  return {
    service: MEMORY_SERVICE,
    command: `+${action}`,
    description: `${action[0].toUpperCase()}${action.slice(1)} an AgentSpace memory`,
    flags: [...targetFlags, { name: 'id', type: 'string', required: true, desc: 'Memory ID' }, { name: 'version', type: 'number', required: true, desc: 'Current memory version' }],
    risk: action === 'delete' ? 'high-risk-write' : 'write',
    preflight: action === 'delete' ? version : undefined,
    validate: version,
    dryRun: (ctx) => targetDryRun(ctx, 'POST', `memories/${encodeURIComponent(ctx.str('id'))}/${action}`, compact({ version: version(ctx), conversationId: conversationId(ctx) })),
    execute: (ctx) => targetPost(ctx, `memories/${encodeURIComponent(ctx.str('id'))}/${action}`, compact({ version: version(ctx), conversationId: conversationId(ctx) })),
  };
}

export function draftContentBody(ctx: RuntimeContext) {
  return compact({ version: version(ctx), title: optional(ctx, 'title'), content: ctx.str('content'), scopeType: 'space', agentId: null });
}

export function draftActionCommand(action: 'delete' | 'submit'): Command {
  const contentFlags = action === 'submit'
    ? [{ name: 'title', type: 'string' as const, required: false, desc: 'Final title' }, { name: 'content', type: 'string' as const, required: true, maxLength: 4000, desc: 'Final content' }]
    : [];
  return {
    service: MEMORY_SERVICE,
    command: `+draft-${action}`,
    description: `${action === 'delete' ? 'Delete' : 'Submit'} a private memory draft`,
    flags: [...targetFlags, { name: 'draft-id', type: 'string', required: true, desc: 'Draft ID' }, { name: 'version', type: 'number', required: true, desc: 'Current draft version' }, ...contentFlags],
    risk: action === 'delete' ? 'high-risk-write' : 'write',
    preflight: action === 'delete' ? version : undefined,
    validate: version,
    dryRun: (ctx) => targetDryRun(ctx, 'POST', `drafts/${encodeURIComponent(ctx.str('draftId'))}/${action}`, action === 'delete' ? { version: version(ctx) } : draftContentBody(ctx)),
    execute: (ctx) => targetPost(ctx, `drafts/${encodeURIComponent(ctx.str('draftId'))}/${action}`, action === 'delete' ? { version: version(ctx) } : draftContentBody(ctx)),
  };
}

export function candidateBody(ctx: RuntimeContext) {
  const targetMemoryId = optional(ctx, 'targetMemoryId');
  const targetMemoryVersion = ctx.optionalNum('targetMemoryVersion');
  if ((targetMemoryId === undefined) !== (targetMemoryVersion === undefined)) {
    throw new Error('--target-memory-id and --target-memory-version must be provided together');
  }
  return compact({ title: optional(ctx, 'title'), content: ctx.str('content'), scopeType: 'space', agentId: null, targetMemoryId, targetMemoryVersion });
}

export function candidateActionCommand(action: 'approve' | 'reject' | 'withdraw'): Command {
  const reasonFlag = action === 'reject'
    ? [{ name: 'reason', type: 'string' as const, required: false, maxLength: 1000, desc: 'Optional rejection reason' }]
    : [];
  return {
    service: MEMORY_SERVICE,
    command: `+candidate-${action}`,
    description: `${action[0].toUpperCase()}${action.slice(1)} a shared AgentSpace memory candidate`,
    flags: [...targetFlags, { name: 'candidate-id', type: 'string', required: true, desc: 'Candidate ID' }, { name: 'version', type: 'number', required: true, desc: 'Current candidate version' }, ...reasonFlag],
    risk: 'write',
    validate: version,
    dryRun: (ctx) => targetDryRun(ctx, 'POST', `candidates/${encodeURIComponent(ctx.str('candidateId'))}/${action}`, compact({ version: version(ctx), reason: action === 'reject' ? optional(ctx, 'reason') : undefined })),
    execute: (ctx) => targetPost(ctx, `candidates/${encodeURIComponent(ctx.str('candidateId'))}/${action}`, compact({ version: version(ctx), reason: action === 'reject' ? optional(ctx, 'reason') : undefined })),
  };
}

export function settingsBody(ctx: RuntimeContext) {
  const autoExtractionEnabled = ctx.json('autoExtractionEnabled');
  const excluded = ctx.json('excluded');
  const currentConversationId = conversationId(ctx);
  if (autoExtractionEnabled === undefined && excluded === undefined) throw new Error('Provide --auto-extraction-enabled or --excluded');
  if (excluded !== undefined && !currentConversationId) throw new Error('--excluded requires --conversation-id outside an Agent conversation');
  return compact({ autoExtractionEnabled, conversationId: excluded === undefined ? undefined : currentConversationId, excluded });
}

export function retiredCommand(name: string, replacement: string, flags: Flag[] = []): Command {
  return {
    service: MEMORY_SERVICE,
    command: name,
    hidden: true,
    description: 'Retired legacy user-memory command',
    flags,
    risk: 'read',
    execute: async () => {
      throw new CliValidationError(`${name} was retired with AgentSpace memory v2.`, {
        code: 'MEMORY_COMMAND_RETIRED',
        hint: replacement,
      });
    },
  };
}

export const retiredIdFlag: Flag = { name: 'id', type: 'string', required: false, desc: 'Retired resource ID' };
export const retiredAgentFlag: Flag = { name: 'agent-id', type: 'string', required: false, desc: 'Retired Agent target' };
export const retiredScopeFlag: Flag = { name: 'scope', type: 'string', required: false, desc: 'Retired memory scope' };
