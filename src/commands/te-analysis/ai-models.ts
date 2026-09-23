import type { Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';

export const AI_MODEL_TYPE_VALUES = [
  'event',
  'retention',
  'funnel',
  'distribution',
  'attribution',
  'interval',
  'path',
  'prop_analysis',
  'sql',
  'heat_map',
  'rank_list',
  'revenue',
] as const;

export const AI_MODEL_DESCRIPTION =
  'Supported AI-facing model_type values, 12 total. 9 common models: event (event analysis), retention (retention analysis), funnel (funnel conversion), distribution (distribution analysis), attribution (attribution analysis), interval (interval analysis), path (path analysis), prop_analysis (property analysis), sql (SQL analysis). 3 scenario models: heat_map (heat map analysis), rank_list (ranking analysis), revenue (revenue analysis). Tags and cohorts/clusters are separate capabilities and are not ad-hoc model_type values.';

export const REPORT_WRITE_MODEL_TYPE_VALUES = [
  ...AI_MODEL_TYPE_VALUES,
  'tag',
] as const;

export const REPORT_WRITE_MODEL_DESCRIPTION =
  `${AI_MODEL_DESCRIPTION} Report create/update also supports tag for saved tag report data; use tag as the AI-facing spelling.`;

export const AI_DEFINITION_DESCRIPTION =
  'Event metrics: omit optional display_name unless the target command schema explicitly supports it. Funnel step filters use event_property_name (not field) and string-array values, including "true"/"false" for boolean properties. ' +
  'For tag/cluster filters, cluster_date_policy accepts LATEST (default), AUTO (match the computed result for each analysis date), or SPECIFIED (requires specified_cluster_date in yyyy-MM-dd format). ' +
  'AI-facing model definition JSON. Do not pass raw QP, events, event_view, visual_view, or analysis_query. Distribution filters must be attached to the corresponding distribution_metrics[].filters; do not use top-level filters or relation. For path definitions, global filters support user_property, cluster, and tag only; event_property is not supported. session_unit accepts second (1..999), minute (1..999), or hour (1..24). Do not use day; express one day as session_interval=24 and session_unit=hour. For SQL, a simple query is {"sql":"select ..."}; raw variables use ${name}, while typed params use ${Text:name}, ${Selector:name}, or ${PartDate:name}. PartDate expands to a complete predicate, so write WHERE ${PartDate:d}, not a column followed by the placeholder. A part_date parameter may set boolean use_timezone; it defaults to false and controls whether that parameter uses the query effective timezone. Selector value must match one options[].value. Trino identifiers containing #, $, @, spaces, punctuation, or a reserved word must be delimited with double quotes, for example SELECT "#user_id", "$part_event", "end" FROM ...; single quotes are string literals. For multiline SQL JSON, the decoded sql value must contain a real line break; do not submit a literal \\n sequence outside quoted SQL text. Queries against an event table must include a date-partition predicate on the quoted "$part_date" column, for example WHERE "$part_date" BETWEEN \'2026-07-01\' AND \'2026-07-07\'; the backend rejects event-table SQL without it. The CLI preserves SQL text and never auto-quotes identifiers.';

export const REPORT_WRITE_DEFINITION_DESCRIPTION =
  `${AI_DEFINITION_DESCRIPTION} Saved-report filters may contain one compound group level only; every item inside that group must be a leaf without another items array. Historical deeper trees remain readable but cannot be written back as a definition. For model_type=tag, pass a tag report intent such as {"tag":{"tag_name":"vip_users","time_range":{"mode":"recent","unit":"day","value":7}}}. Tags are supported for report create/update and report data, not ad-hoc analysis.`;

export function aiModelTypeFlag(required: boolean): Flag {
  return {
    name: 'model-type',
    type: 'string',
    required,
    desc: AI_MODEL_DESCRIPTION,
  };
}

/** Catch the known step-filter mismatch before the gateway's multi-model oneOf errors. */
export function validateFunnelStepFilters(modelType: string, definition: unknown): void {
  if (modelType !== 'funnel' || !isRecord(definition) || !isRecord(definition.funnel)) return;
  const steps = definition.funnel.steps;
  if (!Array.isArray(steps)) return;
  const errors: string[] = [];
  const visit = (filter: unknown, location: string): void => {
    if (!isRecord(filter)) {
      errors.push(`${location}: use a filter object.`);
      return;
    }
    if ('items' in filter) {
      if (Object.keys(filter).some((key) => key !== 'items' && key !== 'relation')) {
        errors.push(`${location}: compound groups contain only items and relation; put event_property_name and operator on their leaf items.`);
      }
      if (!Array.isArray(filter.items) || filter.items.length === 0) {
        errors.push(`${location}.items: use a non-empty array of event-property filters or nested groups.`);
      } else {
        filter.items.forEach((item: unknown, index: number) => visit(item, `${location}.items[${index}]`));
      }
      return;
    }
    if ('field' in filter || typeof filter.event_property_name !== 'string' || !filter.event_property_name.trim()) {
      errors.push(`${location}: use a non-empty event_property_name, not a generic field object.`);
    }
    if ('values' in filter && (!Array.isArray(filter.values) || filter.values.some((value: unknown) => typeof value !== 'string'))) {
      errors.push(`${location}.values: use an array of strings (boolean properties use "true" or "false").`);
    }
  };
  steps.forEach((step: unknown, stepIndex: number) => {
    if (!isRecord(step) || !Array.isArray(step.filters)) return;
    step.filters.forEach((filter: unknown, filterIndex: number) => visit(filter, `definition.funnel.steps[${stepIndex}].filters[${filterIndex}]`));
  });
  if (errors.length) {
    throw new CliValidationError(errors.join('\n'), {
      code: 'INVALID_ANALYSIS_DEFINITION',
      hint: 'Correct all reported step-filter fields together, preserve the complete requested definition, then validate it once. No query was dispatched.',
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function reportWriteModelTypeFlag(required: boolean): Flag {
  return {
    name: 'model-type',
    type: 'string',
    required,
    desc: REPORT_WRITE_MODEL_DESCRIPTION,
  };
}

export function aiDefinitionFlag(required: boolean): Flag {
  return {
    name: 'definition',
    type: 'json',
    required,
    desc: AI_DEFINITION_DESCRIPTION,
  };
}

export function reportWriteDefinitionFlag(required: boolean): Flag {
  return {
    name: 'definition',
    type: 'json',
    required,
    desc: REPORT_WRITE_DEFINITION_DESCRIPTION,
  };
}

export const metadataResolutionsFlag: Flag = {
  name: 'resolutions',
  type: 'json',
  required: false,
  desc: 'Optional user-confirmed metadata bindings keyed by compiler error path. Each value requires raw_value, resource_type, and resource_key. Keep each bound field\'s path and raw_value; fill the confirmed aggregation and other model parameters in the definition.',
};

export const reportMetadataResolutionsFlag: Flag = {
  ...metadataResolutionsFlag,
  desc: `${metadataResolutionsFlag.desc} This option is not supported with --model-type tag.`,
};

export function validateReportMetadataResolutions(ctx: RuntimeContext): void {
  if (ctx.json('resolutions') !== undefined && ctx.str('model-type') === 'tag') {
    throw new Error('--resolutions is not supported with --model-type tag.');
  }
}
