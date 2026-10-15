import { CliValidationError } from '../../core/errors.js';
import type { Flag, RuntimeContext } from '../../framework/types.js';
import { currentAgentSpaceId } from '../../core/agent-space-context.js';
import { getWorkspaceApi, WORKSPACE_CLI_BASE_PATH } from './client.js';

export type WorkspaceTarget = {
  agentSpaceId: string;
  spaceType: 'personal' | 'shared';
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  capabilities?: Record<string, boolean>;
};

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export const workspaceTargetFlags: Flag[] = [
  {
    name: 'workspace-id',
    type: 'string',
    required: false,
    desc: 'AgentSpace ID; defaults to the current AgentSpace or resolves from the current conversation',
  },
  {
    name: 'conversation-id',
    type: 'string',
    required: false,
    desc: 'Conversation ID used to verify or resolve the AgentSpace target',
  },
];

export function workspaceTargetParams(ctx: RuntimeContext): URLSearchParams {
  const params = new URLSearchParams();
  const workspaceId =
    optional(ctx.str('workspaceId')) ?? currentAgentSpaceId();
  const conversationId =
    optional(ctx.str('conversationId')) ?? optional(process.env.TE_AGENT_CONVERSATION_ID);
  if (!workspaceId && !conversationId) {
    throw new CliValidationError(
      'Workspace target is required. Provide --workspace-id or --conversation-id, or run inside an AgentSpace conversation.',
    );
  }
  if (workspaceId) params.set('agentSpaceId', workspaceId);
  if (conversationId) params.set('conversationId', conversationId);
  return params;
}

export function workspaceTargetPath(ctx: RuntimeContext): string {
  return `${WORKSPACE_CLI_BASE_PATH}/target?${workspaceTargetParams(ctx).toString()}`;
}

export async function resolveWorkspaceTarget(ctx: RuntimeContext): Promise<WorkspaceTarget> {
  return getWorkspaceApi<WorkspaceTarget>(ctx, workspaceTargetPath(ctx));
}

export function workspaceResourcePath(agentSpaceId: string, suffix = ''): string {
  return `${WORKSPACE_CLI_BASE_PATH}/agent-spaces/${encodeURIComponent(agentSpaceId)}${suffix}`;
}

export function previewWorkspaceResourcePath(ctx: RuntimeContext, suffix = ''): string {
  const id =
    optional(ctx.str('workspaceId')) ??
    currentAgentSpaceId() ??
    ':resolved-workspace-id';
  return workspaceResourcePath(id, suffix);
}
