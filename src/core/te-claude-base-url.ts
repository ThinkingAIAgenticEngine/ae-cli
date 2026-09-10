/** Resolve the same application path for Agent metadata and dependency requests. */
export function resolveTeClaudeBaseUrl(host: string): string {
  const base = host.replace(/\/+$/, '');
  const configured = (
    process.env.TE_CLAUDE_BASE_PATH ?? process.env.AE_API_PREFIX ?? '/agent'
  ).trim();
  const path = configured.replace(/^\/+|\/+$/g, '');
  const basePath = path ? `/${path}` : '';
  return basePath && !base.endsWith(basePath) ? `${base}${basePath}` : base;
}
