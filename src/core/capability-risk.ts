/** Capability / CLI command risk levels (aligned with lark-cli). */
export type CapabilityRiskLevel = 'read' | 'write' | 'high-risk-write';

const HIGH_RISK_LEVELS = new Set<CapabilityRiskLevel>(['high-risk-write']);

/** Legacy four-level values mapped to the three-tier model. */
export function normalizeRiskLevel(risk: string | undefined): CapabilityRiskLevel {
  switch (risk) {
    case 'read':
      return 'read';
    case 'high-risk-write':
      return 'high-risk-write';
    case 'delete':
      return 'high-risk-write';
    case 'create':
    case 'update':
    case 'write':
      return 'write';
    default:
      return 'write';
  }
}

/** True when CLI / chat confirmation is required before execution. */
export function requiresConfirmation(risk: string | undefined): boolean {
  return HIGH_RISK_LEVELS.has(normalizeRiskLevel(risk));
}

/** Human-readable risk policy summary for docs and error messages. */
export function riskPolicySummary(): string {
  return 'read/write: no confirmation; high-risk-write (delete): confirmation required';
}

/** Classify a command or enum identifier into the three-tier model. */
export function classifyRiskIdentifier(name: string): CapabilityRiskLevel {
  const u = name.toUpperCase();
  if (/DELETE|REMOVE|DEL_|_DEL\b|RM_|\+DEL|\+DELETE|\+REMOVE|-DELETE|-REMOVE|-DEL\b/.test(u)) {
    return 'high-risk-write';
  }
  if (/^\+LIST|_LIST\b|_GET\b|\+GET\b|-GET\b|\+SEARCH|VALIDATE|MEMBERS|TEST|STATUS/.test(u)) {
    return 'read';
  }
  return 'write';
}
