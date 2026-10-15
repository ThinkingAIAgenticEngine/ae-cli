function value(name: string): string | undefined {
  const current = process.env[name]?.trim();
  return current || undefined;
}

export function currentAgentSpaceId(): string | undefined {
  const explicit = value('TE_AGENT_CURRENT_AGENT_SPACE_ID');
  if (explicit) return explicit;
  const match = /(?:^|\/)spaces\/actived\/([^/]+)(?:\/|$)/.exec(process.cwd());
  return match?.[1];
}

export function isAgentSpaceRuntime(): boolean {
  return Boolean(currentAgentSpaceId());
}

export function assertLegacyWorkspaceCommand(command: 'sync' | 'model'): void {
  if (!isAgentSpaceRuntime()) return;
  throw new Error(
    `ae-cli ${command} manages the legacy sandbox Workspace and is disabled in an AgentSpace runtime. ` +
    'Use ae-cli workspace capability list/set for AgentSpace capabilities.',
  );
}
