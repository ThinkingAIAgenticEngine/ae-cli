import assert from 'node:assert/strict';
import test from 'node:test';
import { conditionTree, renderConditionTree, metricContract, reportContract, reportSignature,
  semanticValue, semanticTime, enrichMetricEvidence, renderExecutionContract, validateSqlExplanations } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/execution-contract.mjs';

const predicate = (field, value) => ({ columnName: field, calcuSymbol: 'C00', ftv: [value] });
const leaf = row => `${row.columnName}=${JSON.stringify(row.ftv)}`;

test('nested filter trees retain relation, scope and literal types', () => {
  const source = { relation: 'and', filts: [predicate('state', false), { relation: 'or', filts: [predicate('n', 0), predicate('n', null)] }] };
  assert.equal(renderConditionTree(conditionTree(source), leaf), '(state=[false] AND (n=[0] OR n=[null]))');
  assert.notDeepEqual(conditionTree(source), conditionTree({ ...source, relation: 'or' }));
  assert.match(renderConditionTree(conditionTree([predicate('a', 1), predicate('b', 2)]), leaf), /UNKNOWN/);
  const unsupported = conditionTree({ filters: { unsupportedPredicate: true } });
  assert.equal(unsupported.unknown, true);
  assert.deepEqual(unsupported.raw, { filters: { unsupportedPredicate: true } });
});

test('formula operands retain local filters, independent time windows and order', () => {
  const metric = { event_name: 'view', filters: [], custom_filters: [{ index: 0, relation: 'and', filts: [predicate('status', 'failed')] }],
    formula_definition: { formulationDeps: [{ event: { eventName: 'view' }, date: { params: [1] } }, { event: { eventName: 'view' }, date: { params: [7] } }] } };
  const first = metricContract(metric);
  assert.equal(first.operand_filters[0].index, 0);
  assert.deepEqual(first.operands[1].date, { params: [7] });
  const changed = structuredClone(metric); changed.formula_definition.formulationDeps[1].date.params = [30];
  assert.notDeepEqual(semanticValue(first), semanticValue(metricContract(changed)));
  changed.formula_definition.formulationDeps.reverse();
  assert.notDeepEqual(first.operands, metricContract(changed).operands);
  changed.custom_filters[0].index = 1;
  assert.notDeepEqual(first.operand_filters, metricContract(changed).operand_filters);
});

test('SQL calculation identity and saved execution settings are distinct', () => {
  const report = { definition_kind: 'SQL', calculation_context: { sql: 'select 1', parameters: [{ name: 'date1', paramType: 'PartDate' }], saved_parameters: [{ paramName: 'date1', recentDay: '0-7' }] } };
  const changed = structuredClone(report); changed.calculation_context.saved_parameters[0].recentDay = '0-30';
  assert.notEqual(reportSignature(report), reportSignature(changed));
  assert.equal(reportSignature(report, report.calculation_context, false), reportSignature(changed, changed.calculation_context, false));
  changed.calculation_context.parameters[0].paramType = 'Text';
  assert.notEqual(reportSignature(report, report.calculation_context, false), reportSignature(changed, changed.calculation_context, false));
});

test('model windows and user cohorts survive alongside empty ordinary metrics', () => {
  const report = { report_model: 3, metric_occurrences: [] };
  const context = { event_view: { userCrowds: [{ crowdName: 'External', relation: 'and', filts: [predicate('is_internal', false)] }], windowsGapValue: 7, windowsGapUnit: 'day', percentConfig: ['avgValue'] } };
  const facts = reportContract(report, context);
  assert.equal(facts.model_config.userCrowds.length, 1);
  assert.equal(facts.model_config.windowsGapValue, 7);
  assert.match(renderExecutionContract(facts), /External/);
  assert.match(renderExecutionContract(facts), /historical behavior window/);
  const changed = structuredClone(context); changed.event_view.userCrowds[0].filts[0].ftv = [true];
  assert.notEqual(reportSignature(report, context), reportSignature(report, changed));
});

test('aggregation parameters are bound by source position and verified identity', () => {
  const metrics = [{ event_name: 'reply', aggregation_code: 'Percentile' }, { event_name: 'reply', aggregation_code: 'Percentile' }];
  const source = [{ eventName: 'reply', analysis: 'Percentile', analysisParams: 80 }, { eventName: 'reply', analysis: 'Percentile', analysisParams: 90 }];
  const enriched = enrichMetricEvidence(metrics, { source_events: source });
  assert.deepEqual(enriched.map(row => row.aggregation_parameters), [80, 90]);
  assert.deepEqual(enrichMetricEvidence(metrics, { source_events: source.slice(1) }), metrics);
  assert.notDeepEqual(semanticValue(metricContract(enriched[0])), semanticValue(metricContract(enriched[1])));
});

test('authored SQL warnings require exact current evidence and reject stale shortcuts', () => {
  const sql = "select round(sum(delta)/count(day)/power(10,4),0) from snapshots where delta > 0 and active_count is not null";
  const summary = { calculation_rules: [{ meaning: 'Average the positive-growth rows and round in ten-thousand units.', evidence: 'round(sum(delta)/count(day)/power(10,4),0)' }],
    coverage_gaps: [{ meaning: 'Rows without activity are absent; missing rows do not establish zero.', evidence: 'active_count is not null' }] };
  assert.doesNotThrow(() => validateSqlExplanations(summary, sql));
  assert.throws(() => validateSqlExplanations(summary, sql.replace('delta', 'net_change')), /exact SQL evidence/);
  assert.throws(() => validateSqlExplanations({ time_semantics: [{ meaning: 'Always move dates by one day' }] }, sql), /exact SQL evidence/);
});

test('array grain and non-additive measures remain explicit', () => {
  const facts = reportContract({ report_model: 0 }, { group_by: [{ columnName: 'engine', arrayGroupType: 'array_item_group' }] });
  const rendered = renderExecutionContract(facts);
  assert.match(rendered, /array_item_group/);
  assert.match(rendered, /not additive/);
  assert.match(rendered, /null, empty arrays, false and zero are distinct/);
});

test('relative-date expansion is not confused with fixed-date execution differences', () => {
  assert.deepEqual(semanticTime({ recent_day: '0-7', start_time: '2026-01-01' }), semanticTime({ recent_day: '0-7', start_time: '2026-02-01' }));
  assert.notDeepEqual(semanticTime({ start_time: '2026-01-01' }), semanticTime({ start_time: '2026-02-01' }));
  const report = { definition_kind: 'SQL', calculation_context: { sql: 'select 1', saved_parameters: [{ paramName: 'date1', recentDay: '0-7', startTime: '2026-01-01' }] } };
  const changed = structuredClone(report);
  changed.calculation_context.saved_parameters[0].startTime = '2026-02-01';
  assert.equal(reportSignature(report), reportSignature(changed));
  assert.doesNotMatch(renderExecutionContract(reportContract(report)), /2026-01-01/);
});

test('unsupported model settings and unresolved SQL lineage stay explicit', () => {
  const facts = reportContract({ definition_kind: 'SQL' }, { event_view: { unfamiliarModelFlag: false }, sql_semantic_facts: { final_select: { fields: [{ name: 'renamed', expression: 'source AS renamed' }] } } });
  const rendered = renderExecutionContract(facts);
  assert.match(rendered, /unfamiliarModelFlag/);
  assert.match(rendered, /semantic support is unknown/);
  assert.match(rendered, /lineage completeness: unknown/);
  assert.throws(() => validateSqlExplanations({ output_fields: [{ name: 'renamed', evidence: 'other AS renamed' }] }, 'select source AS renamed'), /lineage evidence/);
});
