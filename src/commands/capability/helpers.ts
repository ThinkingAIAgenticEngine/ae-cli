import { readFileSync } from 'node:fs';
import { safeJsonParse } from '../../core/json-utils.js';
import { findGatewayDomain } from '../../core/capability-routing.js';

export interface CapabilitySummary {
  id: string;
  description?: string;
  risk?: string;
  output_mode?: string;
  [key: string]: unknown;
}

export class CapabilityCommandValidationError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
    this.name = 'CapabilityCommandValidationError';
  }
}

export function capabilityNamespace(capabilityId: string): string {
  return capabilityId.split('.')[0] ?? '';
}

export function resolveCapabilityGatewayDomain(capabilityId: string, domainOverride?: string): string {
  const cliDomain = domainOverride?.trim() || capabilityNamespace(capabilityId);
  if (!cliDomain) {
    throw new CapabilityCommandValidationError(
      'Cannot determine the capability domain.',
      'Pass --domain <domain>.',
    );
  }
  return findGatewayDomain(cliDomain) ?? cliDomain;
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
  const prefix = `${domain.toLowerCase()}.`;
  const terms = query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];

  return capabilities.filter((capability) => {
    if (!capability.id.toLowerCase().startsWith(prefix)) {
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
  return parsed as Record<string, unknown>;
}
