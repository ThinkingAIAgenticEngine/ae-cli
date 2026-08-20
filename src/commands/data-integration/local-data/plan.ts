import { writeFile } from 'node:fs/promises';
import type { Command } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { readLocalDataMapping } from './mapping.js';
import type { LocalDataMapping } from './types.js';
import type { Draft, Event, PropType, Property, Source } from '../../../tracking/plan/types.js';

const VALID_LOCALES = new Set(['zh', 'en', 'ja', 'ko']);
const EVENT_NAME_RE = /^[a-z][a-z0-9_]*$/;

export interface PlanDraftOptions {
  mapping: LocalDataMapping;
  planName: string;
  eventNames: string[];
  appType: string;
  lang: string;
  projectId?: number;
}

/** Map a local-data property type to the tracking-plan property type. */
function toPropType(type: LocalDataMapping['properties'][number]['type']): PropType {
  switch (type) {
    case 'number': return 'number';
    case 'boolean': return 'bool';
    case 'datetime': return 'datetime';
    case 'list': return 'array_string';
    case 'object': return 'object';
    case 'string': return 'string';
  }
}

/**
 * Convert a confirmed local-data mapping into a canonical tracking-plan draft.
 *
 * Event model follows the mapping mode:
 * - `user_set`: every property becomes a user property; no events.
 * - `track`: every property becomes an event property; one event per resolved event name.
 * - `mixed`: the track event(s) above plus the same properties mirrored as user properties.
 */
export function buildDraftFromMapping(options: PlanDraftOptions): Draft {
  const { mapping } = options;
  const excluded = new Set(mapping.exclude_columns ?? []);
  const properties: Property[] = mapping.properties
    .filter((property) => !excluded.has(property.source))
    .map((property) => ({
      name: property.target,
      display_name: property.source,
      desc: property.desc ?? property.source,
      type: toPropType(property.type),
      source: 'data' as Source,
    }));
  const propNames = properties.map((property) => property.name);

  const eventNames = resolveEventNames(options);
  const events: Event[] = eventNames.map((eventName) => {
    const meta = mapping.event_meta?.[eventName];
    const sourceName = reverseEventSourceName(mapping, eventName) ?? eventName;
    return {
      event_name: eventName,
      display_name: eventName,
      event_desc: meta?.desc ?? sourceName,
      event_tag: meta?.tag ?? sourceName,
      source: 'data' as Source,
      prop_names: propNames,
    };
  });

  const isUserSet = mapping.mode === 'user_set';
  const isMixed = mapping.mode === 'mixed';
  return {
    meta: {
      app_type: options.appType,
      sdk_integration_mode: 'none',
      plan_name: options.planName,
      source_type: 'data',
      lang: options.lang,
      ...(options.projectId !== undefined ? { project_id: options.projectId } : {}),
    },
    events: isUserSet ? [] : events,
    event_properties: isUserSet ? [] : properties,
    common_event_properties: [],
    user_properties: (isUserSet || isMixed)
      ? properties.map((property) => ({ ...property, update_type: 'user_set' as const }))
      : [],
  };
}

/** Find the source (business) event name that maps to the given AE event name, for fallback desc/tag. */
function reverseEventSourceName(mapping: LocalDataMapping, eventName: string): string | undefined {
  const eventMap = mapping.value_mapping?.event_name;
  if (!eventMap) return undefined;
  return Object.keys(eventMap).find((source) => eventMap[source] === eventName);
}

function resolveEventNames(options: PlanDraftOptions): string[] {
  const { mapping } = options;
  if (mapping.mode === 'user_set') return [];
  if (options.eventNames.length > 0) {
    const seen = new Set<string>();
    for (const name of options.eventNames) {
      if (!EVENT_NAME_RE.test(name)) {
        throw new CliValidationError(`The event name "${name}" is not a legal AE event name.`, {
          code: 'LOCAL_DATA_PLAN_INVALID_EVENT_NAME',
          hint: 'Event names must match ^[a-z][a-z0-9_]*$.',
          location: { field: 'event-name' },
        });
      }
      seen.add(name);
    }
    return [...seen];
  }
  if (mapping.default_event_name) return [mapping.default_event_name];
  throw new CliValidationError('The mapping derives event names from a per-row column.', {
    code: 'LOCAL_DATA_PLAN_EVENT_NAMES_REQUIRED',
    hint: 'Pass --event-name for each concrete event name, or set default_event_name in the mapping.',
    location: { field: 'event-name' },
  });
}

function summarize(draft: Draft): {
  plan_name: string;
  events: number;
  event_properties: number;
  user_properties: number;
} {
  return {
    plan_name: draft.meta.plan_name,
    events: draft.events.length,
    event_properties: draft.event_properties.length,
    user_properties: draft.user_properties.length,
  };
}

function buildPlanDraft(ctx: Parameters<Command['execute']>[0]): Draft {
  const mapping = readLocalDataMapping(ctx.str('mapping'));
  const lang = ctx.str('lang');
  if (!VALID_LOCALES.has(lang)) {
    throw new CliValidationError('lang must be one of zh, en, ja, ko.', {
      code: 'LOCAL_DATA_PLAN_INVALID_LANG',
      location: { field: 'lang' },
    });
  }
  return buildDraftFromMapping({
    mapping,
    planName: ctx.str('plan-name').trim() || mapping.default_event_name || 'local-data',
    eventNames: ctx.list('event-name'),
    appType: ctx.str('app-type').trim() || 'unknown',
    lang,
    projectId: ctx.optionalNum('project-id'),
  });
}

export const dataIntegrationPlan: Command = {
  service: 'data-integration',
  command: 'plan',
  usesAeHost: false,
  description: 'Convert a confirmed local-data mapping into a tracking-plan draft.json (source_type=data, sdk_integration_mode=none).',
  flags: [
    { name: 'mapping', type: 'string', required: true, sensitive: true, desc: 'Confirmed ae-local-data-mapping/v1 JSON, file path, or @file.' },
    { name: 'event-name', type: 'string', variadic: true, desc: 'Concrete event name (track/mixed without default_event_name). Repeat for multiple events.' },
    { name: 'plan-name', type: 'string', desc: 'Plan name. Default: the mapping default_event_name, else "local-data".' },
    { name: 'app-type', type: 'string', default: 'unknown', desc: 'Application type recorded in draft meta (informational).' },
    { name: 'lang', type: 'string', default: 'zh', desc: 'xlsx output language: zh / en / ja / ko.' },
    { name: 'project-id', type: 'number', desc: 'AE project ID recorded in draft meta (informational).' },
    { name: 'out', type: 'string', sensitive: true, desc: 'Write draft.json to this file instead of stdout.' },
  ],
  risk: 'write',
  dryRun: async (ctx) => {
    const draft = buildPlanDraft(ctx);
    return {
      action: 'plan_local_data',
      plan_name: draft.meta.plan_name,
      sdk_integration_mode: draft.meta.sdk_integration_mode,
      source_type: draft.meta.source_type,
      events: draft.events.map((event) => event.event_name),
      event_properties: draft.events[0]?.prop_names ?? [],
      user_properties: draft.user_properties.map((property) => property.name),
    };
  },
  execute: async (ctx) => {
    const draft = buildPlanDraft(ctx);
    const outPath = ctx.str('out').trim() || undefined;
    if (!outPath) return draft;
    await writeFile(outPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    return { draft_path: outPath, ...summarize(draft) };
  },
};
