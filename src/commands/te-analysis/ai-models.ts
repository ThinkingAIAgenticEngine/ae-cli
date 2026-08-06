import type { Flag, RuntimeContext } from '../../framework/types.js';

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
  'AI-facing model definition JSON. Do not pass raw QP, events, event_view, visual_view, or analysis_query. Distribution filters must be attached to the corresponding distribution_metrics[].filters; do not use top-level filters or relation. For path definitions, global filters support user_property, cluster, and tag only; event_property is not supported. session_unit accepts second (1..999), minute (1..999), or hour (1..24). Do not use day; express one day as session_interval=24 and session_unit=hour. For SQL, a simple query is {"sql":"select ..."}; raw variables use ${name}, while typed params use ${Text:name}, ${Selector:name}, or ${PartDate:name}. PartDate expands to a complete predicate, so write WHERE ${PartDate:d}, not a column followed by the placeholder. A part_date parameter may set boolean use_timezone; it defaults to false and controls whether that parameter uses the query effective timezone. Selector value must match one options[].value. Trino identifiers containing #, $, @, spaces, punctuation, or a reserved word must be delimited with double quotes, for example SELECT "#user_id", "$part_event", "end" FROM ...; single quotes are string literals. For multiline SQL JSON, the decoded sql value must contain a real line break; do not submit a literal \\n sequence outside quoted SQL text. Queries against an event table must include a date-partition predicate on the quoted "$part_date" column, for example WHERE "$part_date" BETWEEN \'2026-07-01\' AND \'2026-07-07\'; the backend rejects event-table SQL without it. The CLI preserves SQL text and never auto-quotes identifiers.';

export const REPORT_WRITE_DEFINITION_DESCRIPTION =
  `${AI_DEFINITION_DESCRIPTION} For model_type=tag, pass a tag report intent such as {"tag":{"tag_name":"vip_users","time_range":{"mode":"recent","unit":"day","value":7}}}. Tags are supported for report create/update and report data, not ad-hoc analysis.`;

export function aiModelTypeFlag(required: boolean): Flag {
  return {
    name: 'model-type',
    type: 'string',
    required,
    desc: AI_MODEL_DESCRIPTION,
  };
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
  desc: 'Optional user-confirmed metadata bindings keyed by compiler error path. Each value requires raw_value, resource_type, and resource_key. Reuse the unchanged definition and only pass values explicitly confirmed by the user.',
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
