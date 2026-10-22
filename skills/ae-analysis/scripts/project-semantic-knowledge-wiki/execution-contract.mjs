// Structural facts only. Business meanings and asset routes remain Agent-authored.
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = value => Array.isArray(value) ? value : [];
const valueOf = value => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};
const present = value => value !== undefined && value !== null && value !== '';
const pick = (source, keys) => Object.fromEntries(keys.filter(key => present(source[key])).map(key => [key, source[key]]));
const displayKeys = new Set(['display_name', 'eventNameDisplay', 'eventDesc', 'analysisDesc', 'quotaDesc', 'columnDesc', 'eventUuid', 'uuid']);

export function semanticValue(value) {
  if (Array.isArray(value)) return value.map(semanticValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).filter(key => !displayKeys.has(key)).sort()
    .map(key => [key, semanticValue(value[key])]));
}

export function semanticTime(value) {
  const time = { ...obj(value) };
  if (present(time.recentDay ?? time.recent_day)) {
    for (const key of ['startTime', 'endTime', 'start_time', 'end_time']) delete time[key];
  }
  return time;
}

export function logicalRelation(value) {
  const relation = String(value ?? '').toLowerCase();
  return ({ '1': 'AND', '0': 'OR', and: 'AND', or: 'OR' })[relation] || `UNKNOWN(${relation || 'unspecified'})`;
}

export function conditionTree(value, relation) {
  if (Array.isArray(value)) return { relation: logicalRelation(relation), items: value.map(item => conditionTree(item)) };
  const source = obj(value);
  const nested = source.filts ?? source.items ?? source.filters;
  if (nested != null) {
    if (!Array.isArray(nested)) return { unknown: true, raw: source };
    return { relation: logicalRelation(source.relation ?? source.junctionKind ?? relation), items: nested.map(item => conditionTree(item)) };
  }
  if (!Object.keys(source).length) return { unknown: true };
  return { predicate: source };
}

export function renderConditionTree(value, leaf) {
  if (value.predicate) return leaf(value.predicate);
  if (value.unknown) return 'Unknown predicate; verify the source definition';
  if (!value.items.length) return 'No conditions in this scope';
  if (value.items.length === 1) return renderConditionTree(value.items[0], leaf);
  return `(${value.items.map(item => renderConditionTree(item, leaf)).join(` ${value.relation} `)})`;
}

export function metricContract(item) {
  const formula = obj(item.formula_definition ?? item.formula);
  return {
    ...pick(item, ['event_name', 'aggregation_code', 'measure_key', 'formula_expression', 'entity_grain', 'aggregation_parameters', 'time_scope']),
    filters: item.filters == null ? null : conditionTree(item.filters, item.relation),
    operand_filters: list(item.custom_filters).map(filter => ({ index: filter.index, tree: conditionTree(filter, filter.relation) })),
    operands: list(formula.formulationDeps).map((dependency, index) => ({ index,
      ...pick(obj(dependency), ['event', 'quota', 'property', 'date', 'timeRange', 'time_scope', 'quotaTimeRange']),
    })),
    operand_time_ranges: item.quota_time_ranges ?? item.quotaTimeRanges ?? null,
  };
}

export const modelConfigKeys = [
  'windowsGapValue', 'windowsGapUnit', 'percentConfig', 'userCrowds', 'retentionType',
  'rtnRateOrNum', 'statType', 'retentionCollectSet', 'relationProps', 'relationPropSplit',
  'unitNum', 'eventModel', 'taIdMeasureVo',
];
const timeKeys = ['recentDay', 'startTime', 'endTime', 'startToNow', 'startToYesterday',
  'timeParticleSize', 'firstDayOfWeek', 'zoneOffset', 'timezone', 'completeIncompletePeriod', 'hideIncompleteData'];
const interpretedViewKeys = new Set([...timeKeys, ...modelConfigKeys, 'filts', 'groupBy', 'group_by',
  'relation', 'sqlViewParams', 'graphShape', 'projectId', 'displayQuotas', 'displayGroups']);

export function reportContract(report, context = report.calculation_context || {}) {
  const view = obj(valueOf(context.event_view));
  const savedParameters = context.saved_parameters ?? view.sqlViewParams ?? null;
  const parameters = list(context.sql_params ?? context.parameters).map(parameter => ({ ...parameter,
    name: parameter.name ?? parameter.paramName,
  }));
  return {
    model: report.report_model,
    groups: context.group_by ?? view.groupBy ?? view.group_by ?? [],
    time: semanticTime({ ...pick(view, timeKeys), ...obj(context.time_scope) }),
    filters: conditionTree(context.filters ?? view.filts ?? [], context.relation ?? view.relation),
    metrics: list(report.metric_occurrences).map(metricContract),
    model_config: { ...pick(view, modelConfigKeys), ...obj(context.model_config) },
    unparsed_model_config: Object.fromEntries(Object.entries(view).filter(([key]) => !interpretedViewKeys.has(key))),
    model_events: list(valueOf(context.source_events)).map(event => pick(obj(event), ['eventName', 'type', 'filts', 'relation', 'analysis', 'analysisParams', 'quota', 'quotaEntities'])),
    parameters,
    saved_parameters: Array.isArray(savedParameters) ? savedParameters.map(parameter => Object.keys(obj(parameter)).length ? semanticTime(parameter) : parameter) : savedParameters,
    sql_projections: report.definition_kind === 'SQL' ? list(obj(context.sql_semantic_facts).final_select?.fields) : [],
  };
}

export function reportSignature(report, context = report.calculation_context || {}, includeSavedSettings = true) {
  const contract = reportContract(report, context);
  contract.time = semanticTime(contract.time);
  if (!includeSavedSettings) contract.unparsed_model_config = {};
  if (report.definition_kind === 'SQL') {
    const definitions = contract.parameters.map(parameter => pick(parameter, ['name', 'paramType', 'type', 'options', 'selectorItems', 'required', 'useTimezone', 'use_timezone']));
    return JSON.stringify(semanticValue({ sql: String(context.sql || '').replace(/\r\n?/g, '\n').trim(),
      parameters: definitions, ...(includeSavedSettings ? { saved_parameters: contract.saved_parameters, time: contract.time } : {}) }));
  }
  return JSON.stringify(semanticValue(contract));
}

export function enrichMetricEvidence(metrics, context) {
  const source = list(valueOf(context.source_events));
  return metrics.map((metric, index) => {
    const raw = obj(source[index]);
    if (source.length !== metrics.length || raw.eventName !== metric.event_name || String(raw.analysis ?? '') !== String(metric.aggregation_code ?? '')) return metric;
    return { ...metric,
      ...(raw.analysisParams != null ? { aggregation_parameters: raw.analysisParams } : {}),
      ...(raw.quotaEntities != null ? { entity_grain: raw.quotaEntities } : {}),
      ...(raw.quotaTimeRanges != null ? { quota_time_ranges: raw.quotaTimeRanges } : {}),
    };
  });
}

const inline = value => `\`${JSON.stringify(value).replaceAll('`', '\\`').replaceAll('\n', ' ')}\``;

export function renderExecutionContract(contract) {
  const rows = [
    '- These are saved definition settings. Execution overrides and inherited dashboard settings require live verification.',
    '- Saved result grouping is listed below. SQL output grain and inherited settings require the asset explanation; referenced metadata is not a saved group.',
    ...contract.groups.map((group, index) => `- Group ${index + 1}: ${inline(group)}`),
    `- Saved population filter structure: ${inline(contract.filters)}`,
    `- Saved time settings: ${Object.keys(contract.time).length ? inline(contract.time) : 'unknown; verify the current definition'}`,
    '- State timing: a historical behavior window does not establish historical values for user or dimension tables. Source refresh times and historical reconstruction require source evidence.',
    '- Empty/missing rows, null, empty arrays, false and zero are distinct. Do not fill missing rows with zero without coverage evidence.',
  ];
  if (contract.groups.some(group => /array/i.test(JSON.stringify(group)))) rows.push('- Array grouping can expand an entity into several rows. Distinct counts, ratios and percentiles are not additive across those rows.');
  if (Object.keys(contract.model_config).length) rows.push(`- Model-specific settings: ${inline(contract.model_config)}`);
  if (Object.keys(contract.unparsed_model_config).length) rows.push(`- Uninterpreted saved configuration; semantic support is unknown: ${inline(contract.unparsed_model_config)}`);
  if ((contract.model_config.windowsGapValue != null || list(contract.model_config.userCrowds).length) && contract.model_events.length) rows.push(`- Model event roles and measures: ${inline(contract.model_events)}`);
  if (contract.parameters.length) rows.push(`- Parameter definitions: ${inline(contract.parameters)}`);
  if (contract.saved_parameters != null) rows.push(`- Saved parameter choices (separate from definitions and call-time overrides): ${inline(contract.saved_parameters)}`);
  if (contract.sql_projections.length) {
    const projections = contract.sql_projections.filter(field => !/\$\{/.test(field.expression || ''));
    rows.push(`- SQL outer projection evidence: ${inline(projections)}`);
    rows.push('- SQL lineage completeness: unknown for nested scopes, CTEs, wildcard fields and dynamic expressions. Output names alone do not prove source meanings; verify unresolved columns.');
  }
  for (const [index, metric] of contract.metrics.entries()) {
    if (metric.operands.length || metric.operand_filters.length || metric.aggregation_parameters != null || metric.entity_grain != null) {
      rows.push(`- Measure ${index + 1} calculation scopes: ${inline(metric)}`);
    }
  }
  return `\n\n## Execution contract\n\n${rows.join('\n')}\n`;
}

export function validateSqlExplanations(summary, sql) {
  const normalize = value => String(value).replace(/\s+/g, ' ').trim();
  for (const key of ['calculation_rules', 'time_semantics', 'coverage_gaps']) {
    if (summary[key] == null) continue;
    if (!Array.isArray(summary[key])) throw new Error(`${key} must be an array.`);
    for (const item of summary[key]) {
      if (!item?.meaning || !item?.evidence || !normalize(sql).includes(normalize(item.evidence))) {
        throw new Error(`${key} requires a meaning and exact SQL evidence from the current definition.`);
      }
    }
  }
  for (const field of list(summary.output_fields)) {
    if (field.evidence != null && !normalize(sql).includes(normalize(field.evidence))) {
      throw new Error('Output field lineage evidence must occur in the current SQL.');
    }
  }
}

export function renderSqlExplanations(summary) {
  return ['calculation_rules', 'time_semantics', 'coverage_gaps'].flatMap(key => list(summary?.[key])
    .map(item => `- ${key}: ${item.meaning} (evidence: ${inline(item.evidence)})`)).join('\n');
}
