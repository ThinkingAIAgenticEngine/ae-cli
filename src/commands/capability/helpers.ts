import { readFileSync } from 'node:fs';
import { safeJsonParse } from '../../core/json-utils.js';
import {
  findGatewayDomain,
  listCapabilityDiscoveryPrefixes,
  listRegisteredCapabilityDomains,
  resolveGatewayDomain,
} from '../../core/capability-routing.js';

export interface CapabilitySummary {
  id: string;
  description?: string;
  risk?: string;
  output_mode?: string;
  [key: string]: unknown;
}

export class CapabilityCommandValidationError extends Error {
  constructor(message: string, readonly hint?: string, readonly code?: string) {
    super(message);
    this.name = 'CapabilityCommandValidationError';
  }
}

const RETIRED_CAPABILITY_REPLACEMENTS: Record<string, string> = {
  'governance.asset_authentication.dashboard_package':
    'ae-cli analysis-meta governance-recommendation export --project-id <project_id> --limit 20',
  'metadata.metric.recommended_scan':
    'ae-cli analysis-meta governance-recommendation export --project-id <project_id> --limit 20',
  'metadata.metric.recommended_create':
    'ae-cli analysis-meta governance-recommendation submit --project-id <project_id> --run-id <run_id> --topic-name <topic_name> --decisions <json>',
};

export function capabilityNamespace(capabilityId: string): string {
  return capabilityId.split('.')[0] ?? '';
}

export function assertCapabilityIsNotRetired(capabilityId: string): void {
  const replacement = RETIRED_CAPABILITY_REPLACEMENTS[capabilityId.trim().toLowerCase()];
  if (!replacement) return;
  throw new CapabilityCommandValidationError(
    `Capability '${capabilityId}' is retired for direct ae-cli capability invocation.`,
    `Use the current recommendation workflow instead: ${replacement}`,
    'CAPABILITY_RETIRED',
  );
}

export function resolveCapabilityGatewayDomain(capabilityId: string, domainOverride?: string): string {
  const cliDomain = domainOverride?.trim() || capabilityNamespace(capabilityId);
  if (!cliDomain) {
    throw new CapabilityCommandValidationError(
      'Cannot determine the capability domain.',
      'Pass --domain <domain>.',
    );
  }
  return resolveGatewayDomain(cliDomain, findGatewayDomain(cliDomain) ?? cliDomain);
}

export function resolveCapabilityListDomain(cliDomain: string): string {
  if (!cliDomain) {
    throw new CapabilityCommandValidationError(
      'Cannot determine the capability domain.',
      'Pass --domain <domain>.',
    );
  }
  const gatewayDomain = findGatewayDomain(cliDomain);
  if (gatewayDomain === undefined) {
    const registeredDomains = listRegisteredCapabilityDomains();
    const registeredHint = registeredDomains.length > 0
      ? `Registered domains: ${registeredDomains.join(', ')}.`
      : 'No capability domains are registered in this ae-cli process.';
    throw new CapabilityCommandValidationError(
      `Capability domain '${cliDomain}' is not registered.`,
      `${registeredHint} Do not guess domain names.`,
      'CAPABILITY_DOMAIN_NOT_REGISTERED',
    );
  }
  return resolveGatewayDomain(cliDomain, gatewayDomain);
}

export function emptyCapabilityCatalogWarning(capabilities: CapabilitySummary[]): string | undefined {
  if (capabilities.length > 0) {
    return undefined;
  }
  return 'No capabilities were returned. This does not prove that the project permission is missing. '
    + 'Stop discovery instead of guessing other domains or retrying. If capabilities are expected, '
    + 'verify the capability deployment, enabled features, and permissions.';
}

export function parseOptionalProjectId(raw?: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim();
  if (!/^[1-9]\d*$/.test(value)) {
    throw new CapabilityCommandValidationError(
      '--project-id must be a positive integer.',
      'Example: --project-id 1',
    );
  }
  const projectId = Number(value);
  if (!Number.isSafeInteger(projectId)) {
    throw new CapabilityCommandValidationError(
      '--project-id is outside the supported integer range.',
      'Pass a positive safe integer.',
    );
  }
  return projectId;
}

export function normalizeCapabilityList(value: unknown): CapabilitySummary[] {
  if (!Array.isArray(value)) {
    throw new Error('Capability gateway returned an invalid catalog: expected an array.');
  }
  return value.filter((item): item is CapabilitySummary => {
    return item !== null
      && typeof item === 'object'
      && typeof (item as Record<string, unknown>).id === 'string';
  });
}

export function filterCapabilities(
  capabilities: CapabilitySummary[],
  domain: string,
  query?: string,
): CapabilitySummary[] {
  const prefixes = listCapabilityDiscoveryPrefixes(domain);
  const terms = query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];

  return capabilities.filter((capability) => {
    if (RETIRED_CAPABILITY_REPLACEMENTS[capability.id.toLowerCase()]) {
      return false;
    }
    const normalizedId = capability.id.toLowerCase();
    if (!prefixes.some((prefix) => normalizedId.startsWith(prefix))) {
      return false;
    }
    if (terms.length === 0) {
      return true;
    }
    const searchable = `${capability.id} ${capability.description ?? ''}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function parseCapabilityInput(raw?: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    if (trimmed === '-') {
      parsed = safeJsonParse(readFileSync(0, 'utf8'));
    } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      parsed = safeJsonParse(trimmed);
    } else {
      const path = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      parsed = safeJsonParse(readFileSync(path, 'utf8'));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CapabilityCommandValidationError(
      `Invalid capability input: ${message}`,
      'Pass an inline JSON object, a JSON file path, @<path>, or - for stdin.',
    );
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CapabilityCommandValidationError(
      'Capability input must be a JSON object.',
      'Example: --input \'{"project_id":1}\'',
    );
  }
  const input = parsed as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(input, 'projectId')) {
    throw new CapabilityCommandValidationError(
      'Unsupported capability input field: projectId.',
      'Use the canonical snake_case field project_id.',
      'UNSUPPORTED_INPUT_FIELDS',
    );
  }
  return input;
}
