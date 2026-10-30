import skillBusinesses from './skill-businesses.json' with { type: 'json' };

/** Analysis and recovery commands are always available and need no config flag. */
export const OPTIONAL_BUSINESSES = ['dataops', 'engage', 'agent', 'community', 'experiment'] as const;
export type OptionalBusiness = typeof OPTIONAL_BUSINESSES[number];
export type BusinessStates = Partial<Record<OptionalBusiness, boolean>>;

// Keep the 6.1 experiment entries when merging shared fixes from release/6.0.
// Experiment shares the Engage gateway route but has its own business license.
const COMMAND_BUSINESSES: Record<string, OptionalBusiness> = {
  dataops_datatable: 'dataops',
  dataops_flow: 'dataops',
  dataops_integration: 'dataops',
  dataops_operations: 'dataops',
  dataops_repo: 'dataops',
  dataops_ide: 'dataops',
  'engage-flow': 'engage',
  'engage-task': 'engage',
  'engage-setting': 'engage',
  'engage-scene': 'engage',
  'engage-activity': 'engage',
  'engage-workbench': 'engage',
  'engage-query': 'engage',
  community: 'community',
  experiment: 'experiment',
  kb: 'agent',
  team: 'agent',
  agent: 'agent',
  memory: 'agent',
  automation: 'agent',
  things: 'agent',
  workspace: 'agent',
  evaluation: 'agent',
  sync: 'agent',
  model: 'agent',
  context: 'agent',
};

/** These are Agent administration leaves, not analysis system resources. */
const AGENT_SYSTEM_COMMANDS = new Set([
  'channel', '+bind-feishu-users', '+create-channel', '+list-channels', '+remove-channel', '+update-channel',
  '+bind-quota-rule-user', '+create-quota-rule', '+get-balance', '+get-balance-alert', '+get-cost-summary',
  '+list-over-limit-users', '+list-quota-rules', '+remove-quota-rule', '+set-balance-alert', '+update-quota-rule',
  '+add-members', '+get-member-stats', '+list-member-candidates', '+list-members', '+remove-member',
  '+set-member-role', '+set-member-status', '+clear-default-model', '+get-default-models',
  '+get-model-sync-settings', '+get-system-model-price-rules', '+list-company-models', '+list-system-models',
  '+set-company-model-enabled', '+set-default-model', '+set-model-sync-settings', '+set-system-model-enabled',
  '+get-sandbox-tool-distribution', '+list-sandbox-tool-operations', '+list-sandbox-tools', '+npm-install',
  '+remove-sandbox-tool', '+set-sandbox-tool-enabled', '+sync-sandbox-tools', '+upload-sandbox-tool',
  '+activate-sandbox-tools', '+deactivate-sandbox-tools', '+refresh-sandbox-tool-status',
  '+batch-create-sandboxes', '+bind-sandbox-user', '+get-sandbox-config', '+list-sandbox-users', '+list-sandboxes',
  '+remove-sandbox', '+set-sandbox-enabled', '+start-sandbox', '+stop-sandbox', '+unbind-sandbox-user',
  '+update-sandbox', '+export-usage', '+export-usage-details', '+get-agent-tool-calls', '+get-usage-combinations',
  '+get-usage-details', '+get-usage-summary',
]);

// The release gate requires an explicit component for every bundled Skill.
// Base and analysis entries remain unconditional, as do unknown runtime names.
const SKILL_BUSINESSES: Record<string, OptionalBusiness> = Object.fromEntries(
  OPTIONAL_BUSINESSES.flatMap(business => skillBusinesses[business].map(name => [name, business])),
);

/** Missing, malformed and future keys stay unknown; analysis cannot be disabled. */
export function normalizeBusinesses(value: unknown): BusinessStates {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result: BusinessStates = {};
  for (const business of OPTIONAL_BUSINESSES) {
    if (typeof record[business] === 'boolean') result[business] = record[business];
  }
  return result;
}

export function businessForCommand(commandPath: readonly string[]): OptionalBusiness | undefined {
  const [service, resource] = commandPath;
  if (service === 'system') return AGENT_SYSTEM_COMMANDS.has(resource) ? 'agent' : undefined;
  return COMMAND_BUSINESSES[service];
}

/** Routing overrides do not change the component that owns the capability. */
export function businessForCapability(idOrDomain: string): OptionalBusiness | undefined {
  const namespace = idOrDomain.trim().toLowerCase().split('.')[0];
  if (namespace === 'dataops' || namespace === 'engage') return namespace;
  return COMMAND_BUSINESSES[namespace];
}

export function businessForSkill(name: string): OptionalBusiness | undefined {
  return SKILL_BUSINESSES[name];
}

export function getSkillBusinessState(name: string, states: BusinessStates): boolean | undefined {
  const business = businessForSkill(name);
  return business ? states[business] : true;
}

/** Unknown components retain their installed Skills for older backend compatibility. */
export function selectBusinessSkills(names: readonly string[], states: BusinessStates): string[] {
  return names.filter((name) => getSkillBusinessState(name, states) !== false);
}
