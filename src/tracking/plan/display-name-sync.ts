import type { Draft, Event, Property } from './types.js';

export type DisplayNameMetadataType =
  'event' | 'event_property' | 'user_property';

interface DisplayNameDefinition {
  name: string;
  displayName: string;
}

interface ExistingDisplayName {
  name: string;
  displayName?: string;
}

export interface DisplayNameSyncGroup {
  type: DisplayNameMetadataType;
  items: Array<Record<string, string>>;
  skippedExisting: string[];
  missingInMetadata: string[];
  missingInDraft: string[];
}

export interface DisplayNameSyncPlan {
  event: DisplayNameSyncGroup;
  event_property: DisplayNameSyncGroup;
  user_property: DisplayNameSyncGroup;
}

export function buildDisplayNameSyncPlan(
  draft: Draft,
  metadata: {
    events: unknown;
    eventProperties: unknown;
    userProperties: unknown;
  },
): DisplayNameSyncPlan {
  return {
    event: buildGroup(
      'event',
      eventDefinitions(draft.events),
      existingDefinitions(metadata.events, 'event_name', 'event_desc'),
    ),
    event_property: buildGroup(
      'event_property',
      propertyDefinitions([
        ...draft.common_event_properties,
        ...draft.event_properties,
      ]),
      existingDefinitions(metadata.eventProperties, 'prop_name', 'prop_desc'),
    ),
    user_property: buildGroup(
      'user_property',
      propertyDefinitions(draft.user_properties),
      existingDefinitions(metadata.userProperties, 'prop_name', 'prop_desc'),
    ),
  };
}

export function assertTrackingDraft(value: unknown): asserts value is Draft {
  if (!isRecord(value)) {
    throw new Error('Tracking draft must be a JSON object.');
  }
  for (const field of [
    'events',
    'event_properties',
    'common_event_properties',
    'user_properties',
  ]) {
    if (!Array.isArray(value[field])) {
      throw new Error(`Tracking draft field "${field}" must be an array.`);
    }
  }
}

function eventDefinitions(events: Event[]): {
  definitions: DisplayNameDefinition[];
  missing: string[];
} {
  return definitions(
    events.map((event) => ({
      name: event.event_name,
      displayName: event.display_name,
    })),
    'event',
  );
}

function propertyDefinitions(properties: Property[]): {
  definitions: DisplayNameDefinition[];
  missing: string[];
} {
  return definitions(
    properties.map((property) => ({
      name: property.name,
      displayName: property.display_name,
    })),
    'property',
  );
}

function definitions(
  candidates: Array<{ name: unknown; displayName: unknown }>,
  kind: 'event' | 'property',
): {
  definitions: DisplayNameDefinition[];
  missing: string[];
} {
  const byName = new Map<string, string>();
  const missing = new Set<string>();

  for (const candidate of candidates) {
    const name = nonEmptyString(candidate.name);
    if (!name) continue;
    const displayName = nonEmptyString(candidate.displayName);
    if (!displayName) {
      if (!byName.has(name)) missing.add(name);
      continue;
    }
    const previous = byName.get(name);
    if (previous && previous !== displayName) {
      throw new Error(
        `Tracking draft maps ${kind} "${name}" to conflicting display names: "${previous}" and "${displayName}".`,
      );
    }
    byName.set(name, displayName);
    missing.delete(name);
  }

  return {
    definitions: [...byName.entries()].map(([name, displayName]) => ({
      name,
      displayName,
    })),
    missing: [...missing],
  };
}

function existingDefinitions(
  value: unknown,
  nameField: string,
  displayNameField: string,
): ExistingDisplayName[] {
  if (!Array.isArray(value)) return [];
  const rows: ExistingDisplayName[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const name = nonEmptyString(item[nameField]);
    if (!name) continue;
    rows.push({
      name,
      displayName: nonEmptyString(item[displayNameField]),
    });
  }
  return rows;
}

function buildGroup(
  type: DisplayNameMetadataType,
  source: { definitions: DisplayNameDefinition[]; missing: string[] },
  existing: ExistingDisplayName[],
): DisplayNameSyncGroup {
  const existingByName = new Map(
    existing.map((item) => [item.name, item.displayName]),
  );
  const items: Array<Record<string, string>> = [];
  const skippedExisting: string[] = [];
  const missingInMetadata: string[] = [];

  for (const definition of source.definitions) {
    if (!existingByName.has(definition.name)) {
      missingInMetadata.push(definition.name);
      continue;
    }
    if (existingByName.get(definition.name)) {
      skippedExisting.push(definition.name);
      continue;
    }
    items.push(
      type === 'event'
        ? { event_name: definition.name, event_desc: definition.displayName }
        : { prop_name: definition.name, prop_desc: definition.displayName },
    );
  }

  return {
    type,
    items,
    skippedExisting,
    missingInMetadata,
    missingInDraft: source.missing,
  };
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
