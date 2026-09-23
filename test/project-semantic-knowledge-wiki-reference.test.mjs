import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const referencePath = path.join(root, 'skills', 'ae-analysis', 'references', 'project_semantic_knowledge_wiki.md');
const scriptPath = path.join(root, 'skills', 'ae-analysis', 'scripts', 'project-semantic-knowledge-wiki');
const generator = path.join(scriptPath, 'generate-build-ir.mjs');
const builder = path.join(scriptPath, 'build-project-semantic-wiki.mjs');
const packager = path.join(scriptPath, 'package-wiki-source-zip.mjs');
const companyKb = path.join(scriptPath, 'company-kb.mjs');
const syncPlanner = path.join(scriptPath, 'plan-kb-source-sync.mjs');
const concurrentUploader = path.join(scriptPath, 'upload-kb-sources-concurrently.mjs');
const reference = fs.readFileSync(referencePath, 'utf8');
const { normalizeSourceForHash } = await import(pathToFileURL(path.join(scriptPath, 'precompiled-source.mjs')));

// Local semantic planning/rendering remains the current source contract.
assert.match(reference, /Company-only target/);
assert.match(reference, /package-wiki-source-zip/);
assert.match(reference, /company-kb/);
assert.match(reference, /local planning and rendering/);
assert.match(reference, /Source directory contract/);
assert.match(reference, /sources\/assets\/reports/);
assert.match(reference, /custom-instructions-file/);
assert.match(reference, /default-compile-rules\.md/);
const defaultCompileRules = fs.readFileSync(path.join(root, 'skills/ae-analysis/scripts/project-semantic-knowledge-wiki/default-compile-rules.md'), 'utf8');
assert.doesNotMatch(defaultCompileRules, /kb-compile|zip-source-trees|\/private\/tmp/);
assert.match(defaultCompileRules, /Precompiled source contract/);
assert.match(defaultCompileRules, /do not dismiss safety states/);
assert.match(defaultCompileRules, /bare numeric links/);
assert.match(defaultCompileRules, /output fields/);
assert.match(defaultCompileRules, /incremental compilation/);
assert.match(defaultCompileRules, /Agent 使用摘要/);
assert.match(defaultCompileRules, /project-level business model/);
assert.match(defaultCompileRules, /business judgment chain/);
assert.match(defaultCompileRules, /mechanical parser echo/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'project-semantic-knowledge-wiki-'));
const assetPackage = path.join(temp, 'asset-package');
const domainPlanPath = path.join(temp, 'business-domain-plan.json');
const outputA = path.join(temp, 'raw-a');
const outputB = path.join(temp, 'raw-b');
const wikiA = path.join(temp, 'wiki-a');
const wikiB = path.join(temp, 'wiki-b');
const wikiDateOnly = path.join(temp, 'wiki-date-only');
const wikiOrderOnly = path.join(temp, 'wiki-order-only');
const wikiSnapshotOnly = path.join(temp, 'wiki-snapshot-only');
const wikiAllVisible = path.join(temp, 'wiki-all-visible');
const wikiChanged = path.join(temp, 'wiki-changed');
const sourceTreeA = path.join(temp, 'wiki-a-kb-source-tree');
const sourceTreeManifestA = path.join(temp, 'wiki-a-kb-source-tree-manifest.json');
const sourceTreeZipA = path.join(temp, 'wiki-a-kb-source-tree.zip');
const sourceTreeChanged = path.join(temp, 'wiki-changed-kb-source-tree');
const sourceTreeManifestChanged = path.join(temp, 'wiki-changed-kb-source-tree-manifest.json');
fs.mkdirSync(path.join(assetPackage, 'indexes'), { recursive: true });
fs.mkdirSync(path.join(assetPackage, 'metadata'), { recursive: true });

const snapshotHash = 'a'.repeat(64);
writeJson(path.join(assetPackage, '.asset-package.json'), {
  schema_version: '3.0', project_id: 196, project_name: 'Example project',
  snapshot_id: 'snapshot-test', snapshot_hash: snapshotHash, generated_at: '2026-09-02T00:00:00Z',
  asset_scope: 'governed', authenticated_asset_count: 9, unauthenticated_asset_count: 1, truncated: false,
  filter_policy: { authenticated_entry_assets_only: true, dependency_closure: true },
});
writeJson(path.join(assetPackage, 'manifest.json'), {
  schema_version: '3.0', project_id: 196, project_name: 'Example project',
  asset_scope: 'governed', truncated: false, generated_at: '2026-09-02T00:00:00Z',
  filter_policy: { authenticated_entry_assets_only: true, dependency_closure: true },
});

writeJsonl('asset-containers', [{
  container_key: 'dashboard_space:10', container_title: 'Commerce', container_kind: 'dashboard_space',
  space_id: '10', scope_type: 'PROJECT_SPACE', dashboard_count: 1, report_count: 1,
  standalone_report_count: 0,
  dashboard_refs: [{ dashboard_id: 'd1', dashboard_name: 'Revenue dashboard', report_count: 1, authenticated: true }],
  standalone_report_refs: [],
}, {
  container_key: 'shared_assets', container_title: 'Shared assets', container_kind: 'shared_assets',
  dashboard_count: 1, report_count: 1, standalone_report_count: 0,
  dashboard_refs: [{ dashboard_id: 'd2', dashboard_name: 'Executive revenue', report_count: 1, authenticated: true }],
  standalone_report_refs: [],
}, {
  container_key: 'unassigned', container_title: 'Unassigned', container_kind: 'unassigned',
  dashboard_count: 0, report_count: 1, standalone_report_count: 1, dashboard_refs: [],
  standalone_report_refs: [
    { report_id: 'r2', report_name: 'Standalone report', authenticated: true },
    { report_id: 'r4', report_name: 'Visual SQL report', authenticated: true },
    { report_id: 'r5', report_name: 'User DAU', authenticated: true },
    { report_id: 'r6', report_name: 'Daily Active Users', authenticated: true },
  ],
}]);

writeJsonl('dashboard-catalog', [
  asset('dashboard', 'd1', 'Revenue dashboard', {
    source_container_ref: containerRef('dashboard_space:10', 'Commerce', 'dashboard_space'),
    note_count: 1,
    notes: [{
      note_id: 'note-1', note_title: '统计口径',
      description: '<p><strong>只统计正式付费客户</strong>，排除测试订单。</p><p>谨慎对外共享&nbsp;</p>', updated_at: '2026-09-02 09:00:00',
    }],
    report_count: 1, report_refs: [{ report_id: 'r1', report_name: 'Revenue' }],
  }),
  asset('dashboard', 'd2', 'Executive revenue', {
    source_container_ref: containerRef('shared_assets', 'Shared assets', 'shared_assets'),
    report_count: 1, report_refs: [{ report_id: 'r3', report_name: 'Placeholder label report' }],
  }),
]);

writeJsonl('report-catalog', [
  asset('report', 'r1', 'Revenue', {
    authenticated: false,
    description: 'Paid revenue', report_model: 0, definition_kind: 'EVENT_ANALYSIS', standalone: false,
    source_container_refs: [containerRef('dashboard_space:10', 'Commerce', 'dashboard_space')],
    dashboard_refs: [{ dashboard_id: 'd1', dashboard_name: 'Revenue dashboard' }],
    metric_occurrence_count: 1,
    metric_occurrences: [{
      display_name: 'Paid amount', event_name: 'pay', event_title: 'Payment',
      metric_key: 'm1',
      aggregation_code: 'A103', aggregation_name: 'Sum', measure_key: 'amount', measure_title: 'Payment amount',
      formula_expression: 'pay.A103/pay.A101',
	      formula_definition: { formulationDeps: [{
	        event: { eventDesc: 'Payment', filter: { filts: [{ columnDesc: 'Paid users' }] } },
	        quota: { quotaDesc: 'Sum' },
	      }, {
	        event: { eventDesc: 'Discount applied' },
	        quota: {},
	      }] },
    }, {
      display_name: '客户数', event_name: 'pay', event_title: 'Payment',
      metric_key: null,
      aggregation_code: 'A101', aggregation_name: '触发用户数', measure_key: '', measure_title: '',
      formula_expression: '', formula_definition: null,
      filters: [], custom_filters: [],
    }],
    calculation_context: {
      group_by: [
        { columnName: 'country', columnDesc: 'Country' },
        { columnName: 'input_tokens', columnDesc: '输入 token' },
        { columnName: 'chat_content', columnDesc: '聊天内容' },
      ],
      filters: [{ tableType: '2', subTableType: 'tag_by_static_sql', columnName: 'segment', columnDesc: 'Customer segment', calcuSymbol: 'C09' }],
      time_scope: { recent_day: '0-7' },
    },
  }),
  asset('report', 'r2', 'Standalone report', {
    report_model: 100, definition_kind: 'SQL', standalone: true,
    source_container_refs: [containerRef('unassigned', 'Unassigned', 'unassigned')], dashboard_refs: [],
    metric_occurrence_count: 0, metric_occurrences: [],
    calculation_context: {
      sql: 'select "date" as day, count(distinct "#user_id") as user_count from v_event_1 where "$part_event" = \'login\' and ${PartDate:date} group by "date" order by user_count desc limit 100',
      parameters: [{ name: 'date', paramType: 'part_date', required: true, use_timezone: false }],
    },
  }),
  asset('report', 'r4', 'Visual SQL report', {
    report_model: 100, definition_kind: 'SQL', standalone: true,
    source_container_refs: [containerRef('unassigned', 'Unassigned', 'unassigned')], dashboard_refs: [],
    metric_occurrence_count: 0, metric_occurrences: [],
    calculation_context: {
      sql: 'select * from (select country as group_0, sum(amount) as amount_0 from v_event_1 where ${PartDate:date} group by country) order by amount_0 desc limit ${Variable2}',
      parameters: [{ name: 'date', paramType: 'part_date', required: true }, { name: 'Variable2', paramType: 'number', paramDisplay: '返回数量', required: true }],
    },
  }),
  asset('report', 'r5', 'User DAU', {
    report_model: 0, definition_kind: 'EVENT_ANALYSIS', standalone: true,
    source_container_refs: [containerRef('unassigned', 'Unassigned', 'unassigned')], dashboard_refs: [],
    metric_occurrence_count: 1,
    metric_occurrences: [{ display_name: 'User DAU', event_name: 'login', event_title: 'Login', aggregation_code: 'A101', aggregation_name: 'Unique users' }],
    calculation_context: { group_by: [], filters: [], time_scope: { recent_day: '0-1' } },
  }),
  asset('report', 'r6', 'Daily Active Users', {
    report_model: 0, definition_kind: 'EVENT_ANALYSIS', standalone: true,
    source_container_refs: [containerRef('unassigned', 'Unassigned', 'unassigned')], dashboard_refs: [],
    metric_occurrence_count: 1,
    metric_occurrences: [{ display_name: 'Daily Active Users', event_name: 'pay', event_title: 'Payment', aggregation_code: 'A101', aggregation_name: 'Unique users' }],
    calculation_context: { group_by: [], filters: [], time_scope: { recent_day: '0-1' } },
  }),
  asset('report', 'r3', 'Placeholder label report', {
    description: 'undefined',
    report_model: 0, definition_kind: 'EVENT_ANALYSIS', standalone: false,
    source_container_refs: [containerRef('shared_assets', 'Shared assets', 'shared_assets')],
    dashboard_refs: [{ dashboard_id: 'd2', dashboard_name: 'Executive revenue' }],
    metric_occurrence_count: 1,
    metric_occurrences: [
      { display_name: 'Dynamic parameter rate', event_name: 'model_query', event_title: 'Model query', aggregation_code: 'A100', aggregation_name: 'Total count' },
      { display_name: 'Dynamic parameter rate', event_name: 'model_query', event_title: 'Model query', aggregation_code: 'A101', aggregation_name: 'Unique users' },
    ],
    calculation_context: {},
  }),
]);

fs.mkdirSync(path.join(assetPackage, 'details', 'normalized', 'report'), { recursive: true });
fs.mkdirSync(path.join(assetPackage, 'details', 'raw', 'report'), { recursive: true });
writeJson(path.join(assetPackage, 'details', 'normalized', 'report', 'r2.json'), {
  raw_locator: { path: 'details/raw/report/r2.json' },
});
writeJson(path.join(assetPackage, 'details', 'raw', 'report', 'r2.json'), {
  raw_definition: {
    visual_view: JSON.stringify({
      groupBys: [{ columnName: 'day', columnDesc: '登录日期', columnType: 'date' }],
      aggregates: [{ columnName: 'user_count', columnDesc: '登录用户数', columnType: 'number', analysis: 'A101' }],
    }),
  },
});
writeJson(path.join(assetPackage, 'details', 'normalized', 'report', 'r4.json'), {
  raw_locator: { path: 'details/raw/report/r4.json' },
});
writeJson(path.join(assetPackage, 'details', 'raw', 'report', 'r4.json'), {
  raw_definition: {
    visual_view: JSON.stringify({
      groupBys: [{ columnName: 'group_0', columnDesc: '国家', columnType: 'string' }],
      aggregates: [{ columnName: 'amount_0', columnDesc: '收入金额', columnType: 'number', analysis: 'A103' }],
    }),
  },
});

writeJsonl('metric-catalog', [asset('metric', 'm1', 'Paid amount metric', {
  metric_occurrence_count: 1,
  metric_occurrences: [{
    display_name: 'Paid amount',
    event_name: 'pay',
    aggregation_code: 'A103',
    aggregation_name: 'Sum',
    measure_key: 'amount',
    filters: [{ columnDesc: 'Paid users', columnName: 'segment', calcuSymbol: 'C01', ftv: ['paid'] }],
  }],
  metric_parameters: { format: 'currency' },
  dependent_events: [{ eventName: 'pay', eventType: 'event', realAvailable: false }],
  dependent_properties: ['amount'],
})]);
fs.writeFileSync(path.join(assetPackage, 'metadata', 'analysis-selectable.jsonl'), `${[
  { record_type: 'header', count: 7 },
  {
    evidenceId: 'analysis_metadata:super_event:pay', resourceType: 'event', resourceKey: 'pay',
    title: 'Payment', description: 'Payment event', authenticated: true,
    updated_at: '2026-09-01 00:00:00', updateTime: '2026-09-01 00:00:00', authenticatedAt: '2026-08-01 00:00:00',
    definitionJson: JSON.stringify({ asset_kind: 'SUPER_EVENT', has_connected: 1 }),
  },
  {
    evidenceId: 'analysis_metadata:super_property:0:amount', resourceType: 'event_prop', resourceKey: 'amount',
    title: 'Payment amount', description: 'Amount paid', authenticated: false,
    definitionJson: JSON.stringify({ asset_kind: 'SUPER_PROPERTY', select_type: 'number', real_data_type: 'double' }),
  },
  {
    evidenceId: 'analysis_metadata:super_property:1:amount', resourceType: 'user_prop', resourceKey: 'amount',
    title: 'User payment amount', description: 'User-level amount', authenticated: true,
    definitionJson: JSON.stringify({ asset_kind: 'SUPER_PROPERTY', table_type: 1, select_type: 'number' }),
  },
  {
    evidenceId: 'analysis_metadata:metric:m1', resourceType: 'metric', resourceKey: 'm1',
    title: 'Paid amount metric', description: 'Reusable paid amount', authenticated: true,
    definitionJson: JSON.stringify({ asset_kind: 'METRIC' }),
  },
  {
    evidenceId: 'analysis_metadata:tag:segment', resourceType: 'user_tag', resourceKey: 'segment',
    title: 'Customer segment', description: 'Customer grouping tag', authenticated: true,
    definitionJson: JSON.stringify({ asset_kind: 'TAG' }),
  },
  {
    evidenceId: 'analysis_metadata:super_event:login', resourceType: 'event', resourceKey: 'login',
    title: 'Login', description: 'Login event', authenticated: true,
    definitionJson: JSON.stringify({ asset_kind: 'SUPER_EVENT' }),
  },
  {
    evidenceId: 'analysis_metadata:super_property:0:date', resourceType: 'event_prop', resourceKey: 'date',
    title: 'Event date', description: 'Event date property', authenticated: true,
    definitionJson: JSON.stringify({ asset_kind: 'SUPER_PROPERTY', table_type: 0 }),
  },
].map(JSON.stringify).join('\n')}\n`);

const validPlan = {
  schema_version: '2.0',
  source_snapshot_hash: snapshotHash,
  generation_method: 'agent_semantic_synthesis',
  project_business_model: {
    business_positioning: '该项目用于观察商业化收入表现，帮助分析人员判断收入规模、趋势和地域差异，并把正式付费客户口径与测试订单排除边界固定下来。',
    audience_roles: ['商业分析师', '运营负责人'],
    business_objects: [{
      object_id: 'customer-segment',
      name: '客户分层',
      meaning: '用于区分正式付费客户和其他客户，是收入分析的主过滤对象。',
      evidence_refs: [{ resource_type: 'dashboard', resource_key: 'd1' }, { resource_type: 'report', resource_key: 'r1' }],
    }, {
      object_id: 'payment-event',
      name: '支付事件',
      meaning: '承载付费金额和付费用户数，是收入判断的事实事件。',
      evidence_refs: [{ resource_type: 'report', resource_key: 'r1' }, { resource_type: 'metric', resource_key: 'm1' }],
    }],
    object_relationships: [{
      from_object: '客户分层',
      to_object: '支付事件',
      relationship: '收入分析先限定正式付费客户分层，再统计支付事件上的金额和用户贡献。',
      evidence_refs: [{ resource_type: 'dashboard', resource_key: 'd1' }],
    }],
    decision_chains: [{
      chain_id: 'commerce-revenue-judgment',
      title: '商业收入判断链路',
      decision_question: '收入规模和趋势是否健康，不同国家的付费表现是否有差异？',
      signals: ['付费金额', '付费用户数', '国家维度', '日期趋势'],
      decision_steps: ['先用收入看板确认正式付费客户口径。', '再看付费金额和付费用户数。', '最后按国家和日期定位差异。'],
      preferred_domain_ids: ['commerce-revenue'],
      asset_refs: [{ resource_type: 'dashboard', resource_key: 'd1' }, { resource_type: 'report', resource_key: 'r1' }],
      requires_live_execution: true,
      boundaries: ['当前收入数值必须实时执行报表', '共享技术示例看板不作为主判断入口'],
    }],
    non_goals: ['不承载当前实时收入数值', '不把共享技术示例资产当成正式收入口径'],
  },
  domains: [{
    domain_id: 'commerce-revenue',
    title: '商业收入分析',
    summary: '围绕付费收入和管理层收入观察组织分析资产。',
    primary_questions: ['收入规模和趋势如何？', '不同国家的付费表现有何差异？'],
    primary_metrics: [
      '付费金额：用于回答收入规模、趋势和国家差异。',
      '付费用户数：用于判断收入由多少用户贡献。',
    ],
    drilldown_dimensions: [
      '国家（`country`）：按国家拆分收入和付费用户。',
      '日期（`date`）：按时间观察趋势。',
    ],
    domain_judgment_model: {
      business_state_judged: '判断商业收入是否稳定增长，以及收入贡献是否集中在特定国家或客户分层。',
      main_objects: ['客户分层', '支付事件', '国家', '日期'],
      signals: ['付费金额', '付费用户数', '国家拆分', '日期趋势'],
      decision_path: ['先确认收入看板是否适用当前问题。', '再核对付费金额和付费用户数口径。', '最后按国家和日期下钻解释差异。'],
      asset_attachment_logic: [{
        asset_ref: { resource_type: 'dashboard', resource_key: 'd1' },
        role: 'primary_entry',
        reason: '收入看板承载正式付费客户过滤、国家分组和收入指标，是该业务域的首选入口。',
      }, {
        asset_ref: { resource_type: 'report', resource_key: 'r1' },
        role: 'drilldown',
        reason: '收入报表用于核对付费金额、付费用户数和国家维度的具体计算口径。',
      }],
      boundaries: ['当前数值必须实时执行资产', '技术示例资产不进入正式收入判断链路'],
    },
    merge_rationale: '该看板围绕收入决策。',
    dashboard_ids: ['d1'],
    recall_cards: [{
      card_id: 'revenue-overview',
      questions: ['收入规模和趋势如何？', '不同国家的付费表现有何差异？'],
      intent: '定位收入规模、趋势和国家差异的权威入口。',
      preferred_asset_refs: [{ resource_type: 'dashboard', resource_key: 'd1', reason: '首选看板同时包含收入规模、国家分组和付费过滤说明，适合先确认收入分析范围。' }],
      fallback_asset_refs: [{ resource_type: 'report', resource_key: 'r1', reason: '当用户只问收入金额或国家拆分时，直接读取该报表可核对指标公式和过滤条件。' }],
      excluded_asset_refs: [{
        resource_type: 'dashboard', resource_key: 'd2', reason: '共享技术示例，不进入主召回。',
        canonical_resource_key: 'd1',
      }],
      requires_live_execution: true,
      live_execution_reason: '当前收入数值必须执行报表。',
    }],
  }],
  appendices: [{
    appendix_id: 'technical-examples',
    title: '技术示例资产',
    summary: '保留共享示例看板用于追溯，不进入主要业务检索。',
    selection_rationale: '看板没有报表定义，无法证明稳定业务问题。',
    dashboard_ids: ['d2'],
  }],
  sql_report_semantics: [{
    report_id: 'r2',
    business_purpose: '按日期统计登录事件的去重用户数。',
    input_parameters: [{ name: 'date', meaning: '目标事件日期', required: true }],
    output_fields: [{ name: 'day', meaning: '事件日期' }, { name: 'user_count', meaning: '登录去重用户数' }],
    statistical_grain: '每行代表一个日期的登录事件聚合结果。',
    key_filters: ['$part_event = login', '按输入日期范围过滤'],
    default_limits: ['按 user_count 降序排序', '最多返回 100 行'],
    applicable_questions: ['指定日期范围内每天有多少登录用户？'],
    non_applicable_questions: ['不能直接回答单个用户的登录明细。'],
    evidence_locator: 'details/normalized/report/r2.json',
    definition_state: 'valid',
	  }, {
	    report_id: 'r4',
	    business_purpose: 'unknown',
	    input_parameters: [{ name: 'Variable2', meaning: '返回数量限制', required: true }],
	    output_fields: [{ name: 'unknown', meaning: 'SQL 使用 select *，输出字段需以源表 payment_summary 当前结构为准' }],
	    statistical_grain: 'unknown',
    key_filters: [],
    default_limits: [],
    applicable_questions: [],
    non_applicable_questions: [],
    evidence_locator: 'details/normalized/report/r4.json',
    definition_state: 'unknown',
  }],
};
writeJson(domainPlanPath, validPlan);

for (const output of [outputA, outputB]) {
  execFileSync(process.execPath, [generator, '--asset-package', assetPackage, '--domain-plan', domainPlanPath, '--output', output], { stdio: 'pipe' });
}

const corpus = JSON.parse(fs.readFileSync(path.join(outputA, 'corpus.json'), 'utf8'));
assert.match(corpus.project_business_model.business_positioning, /商业化收入表现/);
assert.equal(corpus.project_business_model.business_objects.length, 2);
assert.equal(corpus.project_business_model.decision_chains[0].chain_id, 'commerce-revenue-judgment');
assert.deepEqual(corpus.counts, {
  business_domains: 1,
  technical_appendices: 1,
  source_dashboard_spaces: 1,
  technical_containers: 2,
  dashboards: 2,
  dashboards_in_business_domains: 1,
  dashboards_in_technical_appendices: 1,
  dashboards_classified_once: 2,
  shared_dashboards: 1,
  unassigned_dashboards: 0,
  reports: 6,
  reports_linked_to_dashboards: 2,
  reports_in_business_domains: 1,
  reports_in_technical_appendices: 1,
  standalone_reports: 4,
  reusable_metrics: 1,
  analysis_metadata: 7,
  metadata_type_counts: { event: 2, event_prop: 2, metric: 1, user_prop: 1, user_tag: 1 },
  authenticated_assets: 9,
  unauthenticated_dependencies: 1,
  authenticated_reports: 5,
  unauthenticated_reports: 1,
  authenticated_metadata: 6,
  unauthenticated_metadata: 1,
  semantic_conflict_reports: 2,
  semantic_conflict_metadata: 0,
  metadata_missing_source_titles: 0,
  report_metric_occurrences: 6,
  sql_reports: 2,
});
assert.match(fs.readFileSync(path.join(outputA, 'domains', 'commerce-revenue.md'), 'utf8'), /商业收入分析/);
assert.match(fs.readFileSync(path.join(outputA, 'domains', 'commerce-revenue.md'), 'utf8'), /该看板围绕收入决策/);
const rawDomainPage = fs.readFileSync(path.join(outputA, 'domains', 'commerce-revenue.md'), 'utf8');
assert.match(rawDomainPage, /## Agent 使用摘要/);
assert.match(rawDomainPage, /## 这个域判断什么/);
assert.match(rawDomainPage, /判断商业收入是否稳定增长/);
assert.match(rawDomainPage, /首选入口：\[Revenue dashboard\]/);
assert.match(rawDomainPage, /### 主要事件/);
assert.match(rawDomainPage, /Payment（`pay`）/);
assert.match(rawDomainPage, /付费金额：用于回答收入规模、趋势和国家差异。/);
assert.match(rawDomainPage, /付费用户数：用于判断收入由多少用户贡献。/);
assert.match(rawDomainPage, /国家（`country`）：按国家拆分收入和付费用户。/);
assert.match(rawDomainPage, /日期（`date`）：按时间观察趋势。/);
const rawDomainDimensions = markdownSection(rawDomainPage, '### 常用下钻维度');
assert.doesNotMatch(rawDomainDimensions, /input_tokens|输入 token|chat_content|聊天内容/);
assert.match(rawDomainPage, /当前数量、客户名单、趋势结果需要实时执行/);
assert.doesNotMatch(rawDomainPage, /```json|## Agent 规划记录|## 场景召回卡/);
assert.match(fs.readFileSync(path.join(outputA, 'appendices', 'technical-examples.md'), 'utf8'), /不进入主要业务域检索入口/);
assert.match(fs.readFileSync(path.join(outputA, 'source-containers', 'shared_assets.md'), 'utf8'), /不是业务域/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'domains', 'index.md'), 'utf8'), /Shared assets/);
assert.match(fs.readFileSync(path.join(outputA, 'dashboards', 'd1.md'), 'utf8'), /商业收入分析/);
assert.match(fs.readFileSync(path.join(outputA, 'dashboards', 'd1.md'), 'utf8'), /统计口径/);
assert.match(fs.readFileSync(path.join(outputA, 'dashboards', 'd1.md'), 'utf8'), /只统计正式付费客户，排除测试订单/);
assert.match(fs.readFileSync(path.join(outputA, 'dashboards', 'd2.md'), 'utf8'), /技术示例资产/);
assert.match(fs.readFileSync(path.join(outputA, 'reports', 'r1.md'), 'utf8'), /Payment amount/);
assert.match(fs.readFileSync(path.join(outputA, 'reports', 'r1.md'), 'utf8'), /引用元数据（4）/);
assert.match(fs.readFileSync(path.join(outputA, 'reports', 'r3.md'), 'utf8'), /_资产包中没有描述。_/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'reports', 'r3.md'), 'utf8'), /## 描述\s*\n\nundefined/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'events', 'analysis_metadata-super_event-pay.md'), 'utf8'), /被报表引用（2）/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'events', 'analysis_metadata-super_event-pay.md'), 'utf8'), /被可复用指标引用（1）/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'metadata', 'events', 'analysis_metadata-super_event-pay.md'), 'utf8'), /## 原始记录|```json|"definitionJson"/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'event-properties', 'analysis_metadata-super_property-0-amount.md'), 'utf8'), /已认证: false/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'user-properties', 'analysis_metadata-super_property-1-amount.md'), 'utf8'), /被报表引用（0）/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'metrics', 'analysis_metadata-metric-m1.md'), 'utf8'), /被报表引用（1）/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'tags', 'analysis_metadata-tag-segment.md'), 'utf8'), /被报表引用（1）/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'events', 'analysis_metadata-super_event-login.md'), 'utf8'), /被报表引用（2）/);
assert.match(fs.readFileSync(path.join(outputA, 'metadata', 'event-properties', 'analysis_metadata-super_property-0-date.md'), 'utf8'), /被报表引用（1）/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'metadata', 'index.md'), 'utf8'), /事件属性（2）/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'reports', 'r1.md'), 'utf8'), /\[object Object\]/);
assert.match(fs.readFileSync(path.join(outputA, 'reports', 'r2.md'), 'utf8'), /业务域（由承载看板派生）：\n- 无/);
assert.match(fs.readFileSync(path.join(outputA, 'reports', 'r3.md'), 'utf8'), /技术附录（由承载看板派生）：\n- \[技术示例资产\]/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r3.md'), 'utf8'), /独立报表/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r1.md'), 'utf8'), /主要解决的问题/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r1.md'), 'utf8'), /pay\.总和\/pay\.触发用户数/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r1.md'), 'utf8'), /\bA\d{3}(?:_\d+)?\b/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r1.md'), 'utf8'), /过滤：Paid users/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r5.md'), 'utf8'), /semantic_conflict/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'reports', 'r5.md'), 'utf8'), /Daily Active Users/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'dashboards', 'd1.md'), 'utf8'), /主要回答的问题/);
assert.match(fs.readFileSync(path.join(outputA, 'indexes', 'coverage.md'), 'utf8'), /独立报表（不推断业务域） \| 4/);
assert.match(fs.readFileSync(path.join(outputA, 'metrics', 'm1.md'), 'utf8'), /## Agent 使用摘要/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'metrics', 'm1.md'), 'utf8'), /## 原始索引记录|"format": "currency"/);
assert.match(fs.readFileSync(path.join(outputA, 'metrics', 'm1.md'), 'utf8'), /引用元数据（2）/);
assert.match(fs.readFileSync(path.join(outputA, 'metrics', 'm1.md'), 'utf8'), /Paid users 不等于 “paid”/);
assert.doesNotMatch(fs.readFileSync(path.join(outputA, 'metrics', 'm1.md'), 'utf8'), /Filters: \[|Formula definition: \{/);
assert.match(fs.readFileSync(path.join(outputA, 'briefs', 'metrics', 'm1.md'), 'utf8'), /Payment amount/);
assert.match(fs.readFileSync(path.join(outputA, 'indexes', 'coverage.md'), 'utf8'), /语义冲突/);
assert.deepEqual(readTree(outputA), readTree(outputB));

for (const output of [wikiA, wikiB]) {
  execFileSync(process.execPath, [builder,
    '--asset-package', assetPackage,
    '--semantic-plan', domainPlanPath,
    '--output', output,
    '--project-name', 'Example project',
  ], { stdio: 'pipe' });
}

assert.ok(fs.existsSync(path.join(wikiA, 'manifest.json')));
assert.ok(fs.existsSync(path.join(wikiA, 'index.md')));
assert.ok(fs.existsSync(path.join(wikiA, 'wiki', 'index.md')));
assert.ok(fs.existsSync(`${wikiA}-kb-upload-sources`));
assert.ok(fs.existsSync(`${wikiA}.zip`));
const wikiArchiveListing = execFileSync('unzip', ['-Z1', `${wikiA}.zip`], { encoding: 'utf8' });
assert.match(wikiArchiveListing, /^index\.md$/m);
assert.match(wikiArchiveListing, /^wiki\/reports\/revenue-r1\.md$/m);
assert.doesNotMatch(wikiArchiveListing, /^wiki\/(?:dashboards|reports|metrics)\/[0-9]+\.md$/m);
const snapshotIndex = fs.readFileSync(path.join(wikiA, 'index.md'), 'utf8');
assert.doesNotMatch(snapshotIndex, /^---$/m);
assert.doesNotMatch(snapshotIndex, /进入项目语义知识库 Wiki/);
assert.doesNotMatch(snapshotIndex, /个人知识库|只读快照/);
assert.match(snapshotIndex, /\(wiki\/recall-cards\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/project-overview\.md\)/);
assert.match(snapshotIndex, /\(wiki\/domains\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/dashboards\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/reports\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/metrics\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/metadata\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/governance\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/technical-appendices\/index\.md\)/);
assert.match(snapshotIndex, /\(wiki\/source-containers\/index\.md\)/);
assert.ok(!fs.existsSync(path.join(wikiA, 'raw')));
assert.ok(!fs.existsSync(path.join(wikiA, 'briefs')));
assert.ok(!fs.existsSync(path.join(wikiA, 'wiki', 'briefs')));
const reportPage = fs.readFileSync(path.join(wikiA, 'wiki', 'reports', 'revenue-r1.md'), 'utf8');
assert.doesNotMatch(reportPage, /^---$/m);
assert.match(reportPage, /<!--\npage_metadata:/);
assert.match(reportPage, /## Agent 使用摘要/);
assert.match(reportPage, /用途：基于“Payment”事件/);
assert.doesNotMatch(reportPage, /^- 用途：(.+)\n- 适合回答：\n  - \1/m);
assert.match(reportPage, /查看“Revenue”对应的Paid amount、客户数/);
assert.match(reportPage, /Paid amount、客户数/);
assert.match(reportPage, /可按 Country 下钻/);
assert.doesNotMatch(markdownTopLevelSection(reportPage, '## Agent 使用摘要'), /未识别到稳定下钻维度|未发现需要 Agent 解释的输入参数|未发现明确过滤/);
assert.doesNotMatch(reportPage, /用途：用于分析“Revenue”，核心观察/);
assert.doesNotMatch(reportPage, /事件事件/);
assert.match(reportPage, /Customer segment 为真/);
assert.doesNotMatch(reportPage, /Customer segment 为真 未给出固定值/);
assert.match(reportPage, /聚合方式: 总和/);
assert.match(reportPage, /资产包未暴露聚合方式/);
assert.doesNotMatch(reportPage, /未说明聚合/);
assert.doesNotMatch(reportPage, /聚合方式: .*A\d{3}/);
assert.doesNotMatch(reportPage, /`\{"(?:timeRelative|columnType|tableType|calcuSymbol|columnDesc)"/);
assert.match(reportPage, /## 证据定位/);
assert.match(reportPage, /authority_role: dependency_only/);
assert.match(reportPage, /definition_state: valid/);
assert.match(reportPage, /runtime_policy: warn/);
assert.match(reportPage, /standalone_recall: false/);
assert.match(reportPage, /## 召回与权威边界/);
assert.match(reportPage, /只能作为辅助线索/);
assert.match(reportPage, /依赖闭包/);
assert.doesNotMatch(reportPage, /\.\.\/\.\.\/metadata\//);
const dashboardPage = fs.readFileSync(path.join(wikiA, 'wiki', 'dashboards', 'revenue-dashboard-d1.md'), 'utf8');
assert.match(dashboardPage, /看板便签/);
assert.match(dashboardPage, /统计口径/);
assert.match(dashboardPage, /只统计正式付费客户，排除测试订单/);
assert.match(dashboardPage, /谨慎对外共享/);
assert.doesNotMatch(dashboardPage.split('## 精确证据')[0], /<strong>|&nbsp;/);
assert.match(dashboardPage, /## Agent 使用摘要/);
assert.doesNotMatch(dashboardPage, /## 原始索引记录/);
const wikiDomainPage = fs.readFileSync(path.join(wikiA, 'wiki', 'domains', 'commerce-revenue.md'), 'utf8');
assert.match(wikiDomainPage, /## 这个域判断什么/);
assert.match(wikiDomainPage, /判断商业收入是否稳定增长/);
assert.match(wikiDomainPage, /收入报表用于核对付费金额、付费用户数和国家维度的具体计算口径/);
assert.match(wikiDomainPage, /## Agent 使用摘要/);
assert.match(wikiDomainPage, /Payment（`pay`）/);
assert.match(wikiDomainPage, /付费金额：用于回答收入规模、趋势和国家差异。/);
assert.match(wikiDomainPage, /付费用户数：用于判断收入由多少用户贡献。/);
assert.match(wikiDomainPage, /国家（`country`）：按国家拆分收入和付费用户。/);
const wikiDomainDimensions = markdownSection(wikiDomainPage, '### 常用下钻维度');
assert.doesNotMatch(wikiDomainDimensions, /input_tokens|输入 token|chat_content|聊天内容/);
assert.equal((wikiDomainPage.match(/## 场景召回卡/g) ?? []).length, 1);
const sqlPage = fs.readFileSync(path.join(wikiA, 'wiki', 'reports', 'standalone-report-r2.md'), 'utf8');
assert.doesNotMatch(sqlPage, /## SQL 业务语义/);
assert.doesNotMatch(sqlPage, /## SQL Agent 语义摘要/);
assert.match(sqlPage, /按日期统计登录事件的去重用户数/);
assert.match(sqlPage, /## Agent 使用摘要/);
assert.equal((sqlPage.match(/## Agent 使用摘要/g) ?? []).length, 1);
const sqlAgentUsageSummary = markdownTopLevelSection(sqlPage, '## Agent 使用摘要');
assert.match(sqlAgentUsageSummary, /### 输入参数/);
assert.match(sqlAgentUsageSummary, /### 输出字段/);
assert.match(sqlAgentUsageSummary, /### 关键过滤与排除/);
assert.match(sqlAgentUsageSummary, /### 默认限制与排序/);
assert.match(sqlAgentUsageSummary, /### 可回答的问题/);
assert.match(sqlAgentUsageSummary, /### 不可安全回答的问题/);
assert.match(sqlPage, /`user_count`：登录去重用户数/);
assert.match(sqlPage, /目标事件日期（`date`）：required=true/);
assert.match(sqlPage, /最多返回 100 行/);
assert.doesNotMatch(sqlPage, /CLI Agent|摘要来源|semantic_plan|parser fallback|builder/i);
assert.match(sqlPage, /## 证据定位/);
assert.doesNotMatch(sqlPage, /cli_agent_sql_report_semantic_source/);
assert.doesNotMatch(sqlPage, /## 计算上下文/);
assert.doesNotMatch(sqlPage, /"sql_semantic_facts"/);
assert.doesNotMatch(sqlPage, /"visual_view"/);
assert.doesNotMatch(sqlPage, /"extraction_method": "cli_deterministic_sql_facts"/);
assert.doesNotMatch(sqlPage, /"placeholder": "\$\{PartDate:date\}"/);
assert.doesNotMatch(sqlPage, /"table": "v_event_1"/);
assert.doesNotMatch(sqlPage, /## 原始索引记录/);
assert.match(sqlPage, /definition_state: valid/);
const visualSqlPage = fs.readFileSync(path.join(wikiA, 'wiki', 'reports', 'visual-sql-report-r4.md'), 'utf8');
assert.match(visualSqlPage, /## Agent 使用摘要/);
assert.doesNotMatch(visualSqlPage, /## SQL Agent 语义摘要/);
assert.doesNotMatch(visualSqlPage, /CLI Agent|摘要来源|semantic_plan|parser fallback|builder/i);
assert.match(visualSqlPage, /definition_state: unknown/);
assert.match(visualSqlPage, /runtime_policy: block/);
assert.doesNotMatch(visualSqlPage, /semantic_plan_plus_cli_fact_fallback/);
assert.match(visualSqlPage, /用途：通过 SQL 查询“Visual SQL report”相关明细/);
assert.match(visualSqlPage, /返回数量限制：required=true/);
assert.doesNotMatch(visualSqlPage, /Variable2|select \*/i);
assert.match(visualSqlPage, /源表全字段输出，字段清单需回源表 payment_summary 当前结构确认/);
assert.doesNotMatch(visualSqlPage, /## 计算上下文/);

const appendixDashboard = fs.readFileSync(path.join(wikiA, 'wiki', 'dashboards', 'executive-revenue-d2.md'), 'utf8');
assert.match(appendixDashboard, /authority_role: appendix/);
assert.match(appendixDashboard, /runtime_policy: block/);
assert.match(appendixDashboard, /standalone_recall: false/);
assert.match(appendixDashboard, /## 召回与权威边界/);
assert.match(appendixDashboard, /不能作为直接回答入口/);
assert.match(appendixDashboard, /优先使用 `dashboard:d1`/);
const conflictReport = fs.readFileSync(path.join(wikiA, 'wiki', 'reports', 'user-dau-r5.md'), 'utf8');
assert.match(conflictReport, /certification_state: certified/);
assert.match(conflictReport, /definition_state: conflict/);
assert.match(conflictReport, /runtime_policy: block/);
assert.match(conflictReport, /存在同名或近义资产口径冲突/);
const wikiRecallCard = fs.readFileSync(path.join(wikiA, 'wiki', 'recall-cards', 'revenue-overview.md'), 'utf8');
assert.match(wikiRecallCard, /Revenue dashboard（dashboard:d1）/);
assert.doesNotMatch(wikiRecallCard, /\[dashboard:d1\]/);
assert.match(wikiRecallCard, /当前收入数值必须执行报表/);
assert.match(fs.readFileSync(path.join(wikiA, 'wiki', 'governance', 'authority-index.md'), 'utf8'), /dependency_only/);
const projectOverview = fs.readFileSync(path.join(wikiA, 'wiki', 'project-overview.md'), 'utf8');
assert.match(projectOverview, /# Example project 项目业务模型/);
assert.match(projectOverview, /## 项目定位/);
assert.match(projectOverview, /该项目用于观察商业化收入表现/);
assert.match(projectOverview, /## 业务对象/);
assert.match(projectOverview, /客户分层/);
assert.match(projectOverview, /## 对象关系/);
assert.match(projectOverview, /客户分层 -> 支付事件/);
assert.match(projectOverview, /## 业务判断链路/);
assert.match(projectOverview, /商业收入判断链路/);
assert.match(projectOverview, /Revenue dashboard（dashboard:d1）/);
assert.doesNotMatch(projectOverview, /。。证据/);
assert.doesNotMatch(projectOverview, /。；/);
assert.doesNotMatch(projectOverview, /客户健康|Agent 对话|DataOps|EasyStart|私有化/);
const wikiManifest = JSON.parse(fs.readFileSync(path.join(wikiA, 'manifest.json'), 'utf8'));
assert.equal(wikiManifest.package_kind, 'ae_project_semantic_knowledge_wiki');
assert.equal(wikiManifest.semantic_project_id, 196);
assert.equal(wikiManifest.source_project_id_status, 'not_exposed');
assert.equal(wikiManifest.counts.recall_cards, 1);
assert.deepEqual(readTree(wikiA), readTree(wikiB));
assert.deepEqual(fs.readFileSync(`${wikiA}.zip`), fs.readFileSync(`${wikiB}.zip`));
assert.deepEqual(readTree(`${wikiA}-kb-upload-sources`), readTree(`${wikiB}-kb-upload-sources`));

const allVisiblePackage = path.join(temp, 'asset-package-all-visible');
fs.cpSync(assetPackage, allVisiblePackage, { recursive: true });
for (const manifestFile of ['.asset-package.json', 'manifest.json']) {
  const file = path.join(allVisiblePackage, manifestFile);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  writeJson(file, {
    ...manifest,
    asset_scope: 'all_visible',
    filter_policy: {
      ...manifest.filter_policy,
      asset_scope: 'all_visible',
      authenticated_entry_assets_only: false,
      dependency_closure: false,
    },
  });
}
const allVisibleDashboardsPath = path.join(allVisiblePackage, 'indexes', 'dashboard-catalog.jsonl');
const allVisibleDashboards = fs.readFileSync(allVisibleDashboardsPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
allVisibleDashboards[1].authenticated = false;
fs.writeFileSync(allVisibleDashboardsPath, `${allVisibleDashboards.map(JSON.stringify).join('\n')}\n`);
execFileSync(process.execPath, [builder,
  '--asset-package', allVisiblePackage,
  '--semantic-plan', domainPlanPath,
  '--output', wikiAllVisible,
  '--project-name', 'Example project',
  '--allow-all-visible',
], { stdio: 'pipe' });
assert.match(fs.readFileSync(path.join(wikiAllVisible, 'wiki', 'project-overview.md'), 'utf8'), /Asset scope: all_visible/);
assert.match(fs.readFileSync(path.join(wikiAllVisible, 'wiki', 'dashboards', 'revenue-dashboard-d1.md'), 'utf8'), /certification_state: uncertified/);

const uploadFiles = fs.readdirSync(`${wikiA}-kb-upload-sources`, { withFileTypes: true });
assert.ok(uploadFiles.length > 1);
assert.ok(uploadFiles.every((entry) => entry.isFile()));
const uploadMarkdownFiles = uploadFiles.filter((entry) => entry.name.endsWith('.md'));
assert.equal(new Set(uploadMarkdownFiles.map((entry) => entry.name)).size, uploadMarkdownFiles.length);
assert.ok(uploadMarkdownFiles.every((entry) => entry.name.startsWith('pskb-p196-')));
assert.ok(uploadFiles.some((entry) => entry.name === 'kb-upload-manifest.json'));
assert.ok(uploadMarkdownFiles.some((entry) => entry.name === 'pskb-p196-dashboard-index.md'));
assert.ok(uploadMarkdownFiles.some((entry) => entry.name === 'pskb-p196-recall-card-revenue-overview.md'));
assert.ok(uploadMarkdownFiles.some((entry) => entry.name === 'pskb-p196-manifest.md'));
assert.ok(uploadMarkdownFiles.some((entry) => entry.name === 'pskb-p196-refresh-state.md'));
const flatSnapshotIndex = fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'pskb-p196-index.md'), 'utf8');
assert.match(flatSnapshotIndex, /\(pskb-p196-recall-card-index\.md\)/);
assert.doesNotMatch(flatSnapshotIndex, /\(wiki\/recall-cards\/index\.md\)/);
const flatDomain = fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'pskb-p196-domain-commerce-revenue.md'), 'utf8');
assert.match(flatDomain, /## 这个域判断什么/);
assert.match(flatDomain, /\(pskb-p196-recall-card-revenue-overview\.md\)/);
assert.match(flatDomain, /kb_source_namespace: pskb-p196/);
assert.match(flatDomain, /source_path: wiki\/domains\/commerce-revenue\.md/);
assert.match(flatDomain, /## Agent 使用摘要/);
assert.match(flatDomain, /Payment（`pay`）/);
assert.match(flatDomain, /付费金额：用于回答收入规模、趋势和国家差异。/);
assert.match(flatDomain, /付费用户数：用于判断收入由多少用户贡献。/);
const flatSqlReport = fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'pskb-p196-report-standalone-report-r2.md'), 'utf8');
assert.match(flatSqlReport, /## Agent 使用摘要/);
assert.doesNotMatch(flatSqlReport, /## SQL Agent 语义摘要/);
assert.equal((flatSqlReport.match(/## Agent 使用摘要/g) ?? []).length, 1);
const flatSqlAgentUsageSummary = markdownTopLevelSection(flatSqlReport, '## Agent 使用摘要');
assert.match(flatSqlAgentUsageSummary, /### 输入参数/);
assert.match(flatSqlAgentUsageSummary, /### 输出字段/);
assert.doesNotMatch(flatSqlReport, /## 计算上下文/);
assert.doesNotMatch(flatSqlReport, /## 原始索引记录/);
assert.doesNotMatch(flatSqlReport, /event_view|directConversion|queryFeature/);
const flatDashboard = fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'pskb-p196-dashboard-revenue-dashboard-d1.md'), 'utf8');
assert.match(flatDashboard, /## Agent 使用摘要/);
assert.doesNotMatch(flatDashboard, /## 原始索引记录/);
const uploadManifest = JSON.parse(fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'kb-upload-manifest.json'), 'utf8'));
assert.equal(uploadManifest.manifest_kind, 'ae_project_semantic_kb_upload_sources');
assert.equal(uploadManifest.namespace, 'pskb-p196');
assert.equal(uploadManifest.semantic_project_id, 196);
assert.equal(uploadManifest.source_count, uploadMarkdownFiles.length);
assert.ok(uploadManifest.semantic_plan_state.fragments.some((fragment) => fragment.id === 'project:model'));
assert.ok(uploadManifest.semantic_plan_state.fragments.some((fragment) => fragment.id === 'domain:commerce-revenue'));
assert.ok(uploadManifest.semantic_plan_state.fragments.some((fragment) => fragment.id === 'recall-card:revenue-overview'));
assert.ok(uploadManifest.semantic_plan_state.fragments.some((fragment) => fragment.id === 'report:r2:sql_semantics'));
assert.ok(uploadManifest.sources.some((source) => source.display_name === 'pskb-p196-dashboard-revenue-dashboard-d1.md'
  && source.asset_type === 'dashboard'
  && source.asset_key === 'd1'
  && source.source_path === 'wiki/dashboards/revenue-dashboard-d1.md'
  && /^[0-9a-f]{64}$/.test(source.content_hash)
  && source.semantic_plan_fragment_refs.includes('domain:commerce-revenue')));
assert.ok(uploadManifest.sources.some((source) => source.display_name === 'pskb-p196-recall-card-revenue-overview.md'
  && source.semantic_plan_fragment_refs.includes('recall-card:revenue-overview')));
assert.ok(uploadManifest.sources.some((source) => source.display_name === 'pskb-p196-refresh-state.md'
  && source.source_kind === 'refresh-state'
  && source.semantic_plan_fragment_refs.length === uploadManifest.semantic_plan_state.fragment_count));
const refreshStateSource = fs.readFileSync(path.join(`${wikiA}-kb-upload-sources`, 'pskb-p196-refresh-state.md'), 'utf8');
const refreshStatePayload = JSON.parse(Buffer.from(refreshStateSource.match(/pskb_refresh_state_base64\s+([A-Za-z0-9_-]+)/)[1], 'base64url').toString('utf8'));
assert.equal(refreshStatePayload.semantic_plan.schema_version, '2.0');
assert.equal(refreshStatePayload.semantic_plan.domains[0].recall_cards[0].card_id, 'revenue-overview');
assert.ok(refreshStatePayload.semantic_plan_state.fragments.some((fragment) => fragment.id === 'recall-card:revenue-overview'));

const sourceTreeResult = JSON.parse(execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiA}-kb-upload-sources`,
  '--tree-output', sourceTreeA,
  '--manifest-output', sourceTreeManifestA,
  '--output', sourceTreeZipA,
], { encoding: 'utf8' }));
assert.equal(sourceTreeResult.manifest_kind, 'ae_project_semantic_kb_source_tree');
assert.equal(sourceTreeResult.root_path, 'sources');
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'README.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'project', 'README.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'meetings', 'README.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'corrections', 'README.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'assets', 'reports', 'pskb-p196-report-revenue-r1.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'assets', 'dashboards', 'pskb-p196-dashboard-revenue-dashboard-d1.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'business', 'pskb-p196-domain-商业收入分析-commerce-revenue.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'project', 'pskb-p196-manifest.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'project', 'pskb-p196-refresh-state.md')));
assert.ok(fs.existsSync(path.join(sourceTreeA, 'sources', 'project', 'pskb-p196-wiki-project-overview.md')));
assert.ok(!fs.existsSync(path.join(sourceTreeA, 'sources', 'references', 'pskb-p196-wiki-project-overview.md')));
const sourceTreeManifest = JSON.parse(fs.readFileSync(sourceTreeManifestA, 'utf8'));
assert.equal(sourceTreeManifest.manifest_kind, 'ae_project_semantic_kb_source_tree');
assert.equal(sourceTreeManifest.source_count, uploadManifest.source_count + 12);
assert.equal(sourceTreeManifest.filing_guide_count, 12);
assert.ok(sourceTreeManifest.semantic_plan_state.fragments.some((fragment) => fragment.id === 'recall-card:revenue-overview'));
assert.ok(sourceTreeManifest.sources.some((source) => source.file === 'sources/assets/reports/pskb-p196-report-revenue-r1.md'
  && source.display_name === 'pskb-p196-report-revenue-r1.md'
  && source.title === 'Revenue'
  && source.asset_type === 'report'
  && source.asset_key === 'r1'
  && source.semantic_plan_fragment_refs.includes('domain:commerce-revenue')));
assert.match(execFileSync('unzip', ['-Z1', sourceTreeZipA], { encoding: 'utf8' }), /^sources\/README\.md$/m);
assert.match(execFileSync('unzip', ['-Z1', sourceTreeZipA], { encoding: 'utf8' }), /^sources\/assets\/reports\/pskb-p196-report-revenue-r1\.md$/m);
const treeRootIndex = fs.readFileSync(path.join(sourceTreeA, 'sources', 'project', 'pskb-p196-index.md'), 'utf8');
assert.match(treeRootIndex, /\]\(pskb-p196-wiki-project-overview\.md\)/);
assert.doesNotMatch(treeRootIndex, /\]\(pskb-p196-(?!wiki-project-overview)/);
assert.match(treeRootIndex, /\]\(\.\.\/business\/pskb-p196-recall-card-index\.md\)/);
const sourceTreeWithState = path.join(temp, 'wiki-a-kb-source-tree-with-state');
const sourceTreeWithStateManifest = path.join(temp, 'wiki-a-kb-source-tree-with-state-manifest.json');
execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiA}-kb-upload-sources`,
  '--tree-output', sourceTreeWithState,
  '--manifest-output', sourceTreeWithStateManifest,
  '--embed-refresh-state-baseline',
  '--baseline-source-id', 'zip-source-1',
  '--baseline-source-display-name', 'project-semantic-wiki.zip',
  '--baseline-content-revision', '42',
  '--baseline-published-version-id', 'version-11',
], { encoding: 'utf8' });
const refreshStateWithBaseline = fs.readFileSync(path.join(sourceTreeWithState, 'sources', 'project', 'pskb-p196-refresh-state.md'), 'utf8');
const refreshStateWithBaselinePayload = JSON.parse(Buffer.from(
  refreshStateWithBaseline.match(/pskb_refresh_state_base64\s+([A-Za-z0-9_-]+)/)[1],
  'base64url',
).toString('utf8'));
assert.equal(refreshStateWithBaselinePayload.source_tree_baseline.source_id, 'zip-source-1');
assert.equal(refreshStateWithBaselinePayload.source_tree_baseline.content_revision, 42);
assert.equal(refreshStateWithBaselinePayload.source_tree_baseline.published_version_id, 'version-11');
assert.equal(refreshStateWithBaselinePayload.source_tree_baseline.source_tree_manifest.source_count, sourceTreeManifest.source_count);
assert.match(refreshStateWithBaselinePayload.source_tree_baseline.manifest_hash, /^[0-9a-f]{64}$/);
assert.equal(
  sha256(normalizeSourceForHash(refreshStateWithBaseline)),
  sourceTreeManifest.sources.find((source) => source.source_kind === 'refresh-state').content_hash,
);
const refreshStateOnlySyncPlan = JSON.parse(execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiA}-kb-upload-sources`,
  '--tree-output', path.join(temp, 'wiki-a-kb-source-tree-from-refresh-state'),
  '--manifest-output', path.join(temp, 'wiki-a-kb-source-tree-from-refresh-state-manifest.json'),
  '--previous-refresh-state', path.join(sourceTreeWithState, 'sources', 'project', 'pskb-p196-refresh-state.md'),
], { encoding: 'utf8' }));
assert.equal(refreshStateOnlySyncPlan.compile_mode, 'skip');
assert.equal(refreshStateOnlySyncPlan.actions.length, 0);
assert.equal(refreshStateOnlySyncPlan.previous_refresh_state_baseline.source_id, 'zip-source-1');
assert.equal(refreshStateOnlySyncPlan.previous_refresh_state_baseline.content_revision, 42);
const previousFlatManifestWithDeletedSource = path.join(temp, 'previous-flat-upload-manifest-with-deleted-source.json');
writeJson(previousFlatManifestWithDeletedSource, {
  ...uploadManifest,
  sources: [
    ...uploadManifest.sources,
    {
      display_name: 'pskb-p196-report-deleted.md',
      file: 'pskb-p196-report-deleted.md',
      namespace: 'pskb-p196',
      snapshot_date: '2026-09-02',
      snapshot_hash: snapshotHash,
      source_kind: 'report',
      asset_type: 'report',
      asset_key: 'deleted',
      title: 'Deleted report',
      source_path: 'wiki/reports/deleted.md',
      content_hash: 'c'.repeat(64),
    },
  ],
});
const migrationPlan = JSON.parse(execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiA}-kb-upload-sources`,
  '--tree-output', path.join(temp, 'wiki-a-kb-source-tree-from-flat-previous'),
  '--manifest-output', path.join(temp, 'wiki-a-kb-source-tree-from-flat-previous-manifest.json'),
  '--previous-manifest', previousFlatManifestWithDeletedSource,
], { encoding: 'utf8' }));
assert.ok(migrationPlan.actions.some((action) => action.action === 'remove'
  && action.path === 'sources/assets/reports/pskb-p196-report-deleted-report-deleted.md'));

const dateOnlyPackage = path.join(temp, 'asset-package-date-only');
fs.cpSync(assetPackage, dateOnlyPackage, { recursive: true });
writeJson(path.join(dateOnlyPackage, '.asset-package.json'), {
  ...JSON.parse(fs.readFileSync(path.join(dateOnlyPackage, '.asset-package.json'), 'utf8')),
  snapshot_id: 'snapshot-test-next',
  generated_at: '2026-09-03T00:00:00Z',
});
writeJson(path.join(dateOnlyPackage, 'manifest.json'), {
  ...JSON.parse(fs.readFileSync(path.join(dateOnlyPackage, 'manifest.json'), 'utf8')),
  generated_at: '2026-09-03T00:00:00Z',
});
const dateOnlyDashboardsPath = path.join(dateOnlyPackage, 'indexes', 'dashboard-catalog.jsonl');
const dateOnlyDashboards = fs.readFileSync(dateOnlyDashboardsPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
for (const record of dateOnlyDashboards) {
  if (record.record_type === 'header') continue;
  record.updated_at = '2026-09-03 09:00:00';
  for (const note of record.notes ?? []) note.updated_at = '2026-09-03 09:00:00';
}
fs.writeFileSync(dateOnlyDashboardsPath, `${dateOnlyDashboards.map(JSON.stringify).join('\n')}\n`);
for (const indexName of ['report-catalog', 'metric-catalog']) {
  const indexPath = path.join(dateOnlyPackage, 'indexes', `${indexName}.jsonl`);
  const rows = fs.readFileSync(indexPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  for (const record of rows) {
    if (record.record_type === 'header') continue;
    record.updated_at = '2026-09-03 09:00:00';
  }
  fs.writeFileSync(indexPath, `${rows.map(JSON.stringify).join('\n')}\n`);
}
const dateOnlyMetadataPath = path.join(dateOnlyPackage, 'metadata', 'analysis-selectable.jsonl');
const dateOnlyMetadata = fs.readFileSync(dateOnlyMetadataPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
for (const record of dateOnlyMetadata) {
  if (record.record_type === 'header') continue;
  if (record.updated_at) record.updated_at = '2026-09-03 09:00:00';
  if (record.updateTime) record.updateTime = '2026-09-03 09:00:00';
  if (record.authenticatedAt) record.authenticatedAt = '2026-08-03 09:00:00';
}
fs.writeFileSync(dateOnlyMetadataPath, `${dateOnlyMetadata.map(JSON.stringify).join('\n')}\n`);
execFileSync(process.execPath, [builder,
  '--asset-package', dateOnlyPackage,
  '--semantic-plan', domainPlanPath,
  '--output', wikiDateOnly,
  '--project-name', 'Example project',
], { stdio: 'pipe' });
const dateOnlyManifest = JSON.parse(fs.readFileSync(path.join(`${wikiDateOnly}-kb-upload-sources`, 'kb-upload-manifest.json'), 'utf8'));
assert.deepEqual(sourceHashByDisplayName(dateOnlyManifest), sourceHashByDisplayName(uploadManifest));

const orderOnlyPackage = path.join(temp, 'asset-package-order-only');
fs.cpSync(assetPackage, orderOnlyPackage, { recursive: true });
for (const relative of [
  path.join('indexes', 'dashboard-catalog.jsonl'),
  path.join('indexes', 'report-catalog.jsonl'),
  path.join('indexes', 'metric-catalog.jsonl'),
  path.join('metadata', 'analysis-selectable.jsonl'),
]) {
  const file = path.join(orderOnlyPackage, relative);
  const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  fs.writeFileSync(file, `${rows.reverse().join('\n')}\n`);
}
execFileSync(process.execPath, [builder,
  '--asset-package', orderOnlyPackage,
  '--semantic-plan', domainPlanPath,
  '--output', wikiOrderOnly,
  '--project-name', 'Example project',
], { stdio: 'pipe' });
const orderOnlyManifest = JSON.parse(fs.readFileSync(path.join(`${wikiOrderOnly}-kb-upload-sources`, 'kb-upload-manifest.json'), 'utf8'));
assert.deepEqual(sourceHashByDisplayName(orderOnlyManifest), sourceHashByDisplayName(uploadManifest));

const snapshotOnlyPackage = path.join(temp, 'asset-package-snapshot-only');
fs.cpSync(assetPackage, snapshotOnlyPackage, { recursive: true });
const snapshotOnlyHash = 'b'.repeat(64);
writeJson(path.join(snapshotOnlyPackage, '.asset-package.json'), {
  ...JSON.parse(fs.readFileSync(path.join(snapshotOnlyPackage, '.asset-package.json'), 'utf8')),
  snapshot_id: 'snapshot-test-same-assets',
  snapshot_hash: snapshotOnlyHash,
  generated_at: '2026-09-04T00:00:00Z',
});
writeJson(path.join(snapshotOnlyPackage, 'manifest.json'), {
  ...JSON.parse(fs.readFileSync(path.join(snapshotOnlyPackage, 'manifest.json'), 'utf8')),
  snapshot_id: 'snapshot-test-same-assets',
  snapshot_hash: snapshotOnlyHash,
  generated_at: '2026-09-04T00:00:00Z',
});
execFileSync(process.execPath, [builder,
  '--asset-package', snapshotOnlyPackage,
  '--semantic-plan', domainPlanPath,
  '--output', wikiSnapshotOnly,
  '--project-name', 'Example project',
  '--allow-semantic-plan-snapshot-drift',
], { stdio: 'pipe' });
const snapshotOnlyManifest = JSON.parse(fs.readFileSync(path.join(`${wikiSnapshotOnly}-kb-upload-sources`, 'kb-upload-manifest.json'), 'utf8'));
assert.deepEqual(sourceHashByDisplayName(snapshotOnlyManifest), sourceHashByDisplayName(uploadManifest));
const snapshotOnlySyncPlan = JSON.parse(execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiSnapshotOnly}-kb-upload-sources`,
  '--tree-output', path.join(temp, 'wiki-snapshot-only-kb-source-tree'),
  '--manifest-output', path.join(temp, 'wiki-snapshot-only-kb-source-tree-manifest.json'),
  '--previous-manifest', sourceTreeManifestA,
  '--previous-tree-root', sourceTreeA,
], { encoding: 'utf8' }));
assert.equal(snapshotOnlySyncPlan.compile_mode, 'skip');
assert.equal(snapshotOnlySyncPlan.actions.length, 0);

const changedPackage = path.join(temp, 'asset-package-changed');
const changedPlanPath = path.join(temp, 'business-domain-plan-changed.json');
fs.cpSync(assetPackage, changedPackage, { recursive: true });
const changedDashboardsPath = path.join(changedPackage, 'indexes', 'dashboard-catalog.jsonl');
const changedDashboards = fs.readFileSync(changedDashboardsPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
changedDashboards[1].notes[0].description = '<p><strong>只统计正式付费客户</strong>，排除测试订单和内部演示订单。</p>';
fs.writeFileSync(changedDashboardsPath, `${changedDashboards.map(JSON.stringify).join('\n')}\n`);
writeJson(changedPlanPath, {
  ...validPlan,
  domains: [{
    ...validPlan.domains[0],
    recall_cards: [{
      ...validPlan.domains[0].recall_cards[0],
      questions: ['收入规模和趋势如何？', '不同国家的付费表现有何差异？', '收入是否排除了内部演示订单？'],
    }],
  }],
});
execFileSync(process.execPath, [builder,
  '--asset-package', changedPackage,
  '--semantic-plan', changedPlanPath,
  '--output', wikiChanged,
  '--project-name', 'Example project',
], { stdio: 'pipe' });
const sourceTreeSyncPlan = JSON.parse(execFileSync(process.execPath, [packager,
  '--source-dir', `${wikiChanged}-kb-upload-sources`,
  '--tree-output', sourceTreeChanged,
  '--manifest-output', sourceTreeManifestChanged,
  '--previous-manifest', sourceTreeManifestA,
], { encoding: 'utf8' }));
assert.equal(sourceTreeSyncPlan.compile_mode, 'incremental');
assert.ok(sourceTreeSyncPlan.actions.every((action) => action.path.startsWith('sources/')));
assert.ok(sourceTreeSyncPlan.actions.some((action) => action.action === 'replace'
  && action.path === 'sources/assets/dashboards/pskb-p196-dashboard-revenue-dashboard-d1.md'));
assert.ok(sourceTreeSyncPlan.actions.some((action) => action.action === 'replace'
  && action.path === 'sources/business/pskb-p196-recall-card-收入规模和趋势如何-revenue-overview.md'));
assert.deepEqual(sourceTreeSyncPlan.semantic_plan_diff.changed_fragments, ['recall-card:revenue-overview']);
assert.ok(sourceTreeSyncPlan.affected_by_semantic_plan.some((source) => source.path === 'sources/business/pskb-p196-recall-card-收入规模和趋势如何-revenue-overview.md'
  && source.changed_semantic_plan_fragments.includes('recall-card:revenue-overview')));
assert.ok(sourceTreeSyncPlan.affected_by_semantic_plan.some((source) => source.path === 'sources/project/pskb-p196-refresh-state.md'
  && source.changed_semantic_plan_fragments.includes('recall-card:revenue-overview')));
assert.ok(!sourceTreeSyncPlan.actions.some((action) => action.changed_semantic_plan_fragments.includes('domain:commerce-revenue')));
assert.ok(!sourceTreeSyncPlan.actions.some((action) => action.changed_semantic_plan_fragments.includes('project:model')));
assert.ok(sourceTreeSyncPlan.unchanged.includes('sources/assets/reports/pskb-p196-report-revenue-r1.md'));

const { runCompanyKb } = await import(pathToFileURL(companyKb).href);
const compileRulesPath = path.join(temp, 'compile-rules.md');
fs.writeFileSync(compileRulesPath, 'Keep README files as filing guides only.');
const capturedCompanyCalls = [];
await runCompanyKb('+schema', [
  '--name', 'Example Project KB',
  '--model', 'system-model-glm-5.2',
  '--custom-instructions-file', compileRulesPath,
  '--host', 'https://example.test',
], async (flags) => {
  capturedCompanyCalls.push(flags);
  return { ok: true, data: { status: 'queued' } };
});
assert.deepEqual(capturedCompanyCalls[0].slice(0, 2), ['kb', '+schema']);
assert.ok(capturedCompanyCalls[0].includes('--scope'));
assert.equal(capturedCompanyCalls[0][capturedCompanyCalls[0].indexOf('--scope') + 1], 'company');
assert.ok(capturedCompanyCalls[0].includes('--custom-instructions'));
assert.equal(capturedCompanyCalls[0][capturedCompanyCalls[0].indexOf('--custom-instructions') + 1], 'Keep README files as filing guides only.');
assert.ok(!capturedCompanyCalls[0].includes('--custom-instructions-file'));
await assert.rejects(() => runCompanyKb('+new', ['--name', 'Forbidden KB'], async () => ({
  ok: false,
  error: { code: 'forbidden' },
})), /personal fallback/);
const previousManifestPath = path.join(`${wikiA}-kb-upload-sources`, 'kb-upload-manifest.json');
const nextManifestPath = path.join(`${wikiChanged}-kb-upload-sources`, 'kb-upload-manifest.json');
const nextManifest = JSON.parse(fs.readFileSync(nextManifestPath, 'utf8'));
const filteredNextSources = nextManifest.sources.filter((source) => source.display_name !== 'pskb-p196-report-placeholder-label-report-r3.md');
filteredNextSources.push({
  ...nextManifest.sources.find((source) => source.display_name === 'pskb-p196-dashboard-revenue-dashboard-d1.md'),
  display_name: 'pskb-p196-dashboard-synthetic-dashboard-d3.md',
  file: 'pskb-p196-dashboard-synthetic-dashboard-d3.md',
  asset_key: 'd3',
  source_path: 'wiki/dashboards/synthetic-dashboard-d3.md',
  content_hash: 'b'.repeat(64),
});
const simulatedNextManifestPath = path.join(temp, 'simulated-next-upload-manifest.json');
writeJson(simulatedNextManifestPath, { ...nextManifest, source_count: filteredNextSources.length, sources: filteredNextSources });
const remoteSourcesPath = path.join(temp, 'remote-sources.json');
writeJson(remoteSourcesPath, {
  data: {
    sources: [
      ...uploadManifest.sources.map((source, index) => ({
        id: `source-${index}`,
        displayName: source.display_name,
      })),
      { id: 'manual-source', displayName: 'manual-context.md' },
    ],
  },
});
const syncPlan = JSON.parse(execFileSync(process.execPath, [syncPlanner,
  '--previous-manifest', previousManifestPath,
  '--next-manifest', simulatedNextManifestPath,
  '--remote-sources', remoteSourcesPath,
  '--namespace', 'pskb-p196',
  '--full-threshold', '1',
], { encoding: 'utf8' }));
assert.deepEqual(syncPlan.counts, {
  added: 1,
  updated: 3,
  removed: 1,
  unchanged: uploadManifest.source_count - 4,
});
assert.equal(syncPlan.compile_mode, 'incremental');
assert.equal(syncPlan.compile_mode_reason, 'small_source_delta');
assert.equal(syncPlan.requires_schema_force, false);
assert.ok(syncPlan.added.some((source) => source.display_name === 'pskb-p196-dashboard-synthetic-dashboard-d3.md'));
assert.ok(syncPlan.updated.some((source) => source.display_name === 'pskb-p196-dashboard-revenue-dashboard-d1.md'));
assert.ok(syncPlan.updated.some((source) => source.display_name === 'pskb-p196-recall-card-revenue-overview.md'));
assert.ok(syncPlan.updated.some((source) => source.display_name === 'pskb-p196-refresh-state.md'));
assert.ok(syncPlan.updated.some((source) => source.display_name === 'pskb-p196-dashboard-revenue-dashboard-d1.md' && source.source_id));
assert.ok(syncPlan.removed.some((source) => source.display_name === 'pskb-p196-report-placeholder-label-report-r3.md' && source.source_id));

const largeDeltaPlan = JSON.parse(execFileSync(process.execPath, [syncPlanner,
  '--previous-manifest', previousManifestPath,
  '--next-manifest', simulatedNextManifestPath,
  '--remote-sources', remoteSourcesPath,
  '--namespace', 'pskb-p196',
  '--full-threshold', '0.01',
], { encoding: 'utf8' }));
assert.equal(largeDeltaPlan.compile_mode, 'full');
assert.equal(largeDeltaPlan.compile_mode_reason, 'change_ratio_exceeded');
assert.equal(largeDeltaPlan.requires_schema_force, true);
assert.ok(largeDeltaPlan.schema_force_reasons.includes('change_ratio_exceeded'));

const schemaChangedPlan = JSON.parse(execFileSync(process.execPath, [syncPlanner,
  '--previous-manifest', previousManifestPath,
  '--next-manifest', simulatedNextManifestPath,
  '--remote-sources', remoteSourcesPath,
  '--namespace', 'pskb-p196',
  '--full-threshold', '1',
  '--schema-changed',
], { encoding: 'utf8' }));
assert.equal(schemaChangedPlan.compile_mode, 'full');
assert.equal(schemaChangedPlan.compile_mode_reason, 'schema_changed');
assert.equal(schemaChangedPlan.requires_schema_force, true);

const noChangePlan = JSON.parse(execFileSync(process.execPath, [syncPlanner,
  '--previous-manifest', previousManifestPath,
  '--next-manifest', previousManifestPath,
  '--remote-sources', remoteSourcesPath,
  '--namespace', 'pskb-p196',
], { encoding: 'utf8' }));
assert.equal(noChangePlan.compile_mode, 'skip');
assert.equal(noChangePlan.compile_mode_reason, 'no_source_changes');
assert.equal(noChangePlan.requires_schema_force, false);

assertBuildRejected('missing SQL semantics', { ...validPlan, sql_report_semantics: [] }, /missing SQL semantics/);
assertBuildRejected('missing project business model', { ...validPlan, project_business_model: undefined }, /project_business_model requires business_positioning/);
assertBuildRejected('missing domain judgment model', {
  ...validPlan,
  domains: [{ ...validPlan.domains[0], domain_judgment_model: undefined }],
}, /missing domain_judgment_model/);
assertBuildRejected('SQL evidence mismatch', {
  ...validPlan,
  sql_report_semantics: [{ ...validPlan.sql_report_semantics[0], evidence_locator: 'external/sql/r2.sql' }],
}, /evidence_locator must equal its packaged source_detail_path/);
assertBuildRejected('valid SQL without retrieval boundaries', {
  ...validPlan,
  sql_report_semantics: [{ ...validPlan.sql_report_semantics[0], non_applicable_questions: [] }],
}, /marked valid requires output fields plus applicable and non-applicable questions/);
assertBuildRejected('mechanical SQL summary', {
  ...validPlan,
  sql_report_semantics: [{
    ...validPlan.sql_report_semantics[0],
    business_purpose: '根据报表标题“Standalone report”和 SQL 输出结构，用于查看或统计 day、user_count。',
    output_fields: [{ name: 'SQL 输出字段 user_count', meaning: '来源表达式 count(distinct ${Selector:project})' }],
    key_filters: ['WHERE 条件 ${PartDate:date} and ${Selector:project}'],
    applicable_questions: ['当前报表可以按当前 SQL 参数查看哪些结果？'],
  }, validPlan.sql_report_semantics[1]],
}, /not Agent-authored enough/);
assertBuildRejected('visible aggregation code in SQL summary', {
  ...validPlan,
  sql_report_semantics: [{
    ...validPlan.sql_report_semantics[0],
    output_fields: [{ name: '登录用户数', meaning: '按公司和日期统计登录去重用户数（A100）。' }],
  }, validPlan.sql_report_semantics[1]],
}, /raw aggregation code/);
assertBuildRejected('missing recall cards', {
  ...validPlan,
  domains: [{ ...validPlan.domains[0], recall_cards: [] }],
}, /at least one recall card/);

assertRejected('old schema', { packageSchema: '2.0' }, /schema 3\.0 is required/);

assertBuildRejected('generic recall routing text', {
  ...validPlan,
  domains: [{
    ...validPlan.domains[0],
    recall_cards: [{
      ...validPlan.domains[0].recall_cards[0],
      preferred_asset_refs: [{
        ...validPlan.domains[0].recall_cards[0].preferred_asset_refs[0],
        reason: '该认证看板的子报表直接覆盖此业务问题，具体口径以资产页为准。',
      }],
    }],
  }],
}, /generic routing text/);

assertRejected('all visible without explicit flag', { packageScope: 'all_visible' }, /allow-all-visible/);
assertRejected('unsupported collaborative scope', { packageScope: 'collaborative' }, /supports asset_scope=governed/);
assertRejected('missing dependency closure', { dependencyClosure: false }, /must declare authenticated_entry_assets_only=true and dependency_closure=true/);
assertRejected('dangling report reference', { danglingReportRef: true }, /dangling knowledge-index references/);
assertRejected('missing dashboard', { plan: { ...validPlan, appendices: [] } }, /does not classify 1 dashboard/);
assertRejected('duplicate assignment', { plan: { ...validPlan, domains: [
  { ...validPlan.domains[0], dashboard_ids: ['d1', 'd2'] },
] } }, /assigned to both/);
assertRejected('duplicate title', { plan: { ...validPlan, domains: [
  { ...validPlan.domains[0] },
  { ...validPlan.domains[0], domain_id: 'other-domain', dashboard_ids: ['d2'] },
], appendices: [] } }, /duplicate domain title/);
assertRejected('technical container', { plan: { ...validPlan, domains: [{
  ...validPlan.domains[0], domain_id: 'shared_assets', title: 'Shared assets',
}] } }, /Technical source container cannot be used/);

execFileSync(process.execPath, [generator, '--asset-package', assetPackage, '--domain-plan', domainPlanPath, '--output', outputA, '--force'], { stdio: 'pipe' });
assert.equal(JSON.parse(fs.readFileSync(path.join(outputA, 'corpus.json'), 'utf8')).snapshot_hash, snapshotHash);

console.log('project semantic knowledge Wiki reference tests passed');

function assertRejected(name, options, pattern) {
  const fixture = path.join(temp, `rejected-${name.replaceAll(' ', '-')}`);
  const packagePath = path.join(fixture, 'package');
  const planPath = path.join(fixture, 'plan.json');
  fs.mkdirSync(fixture, { recursive: true });
  fs.cpSync(assetPackage, packagePath, { recursive: true });
  if (options.packageSchema) {
    const descriptorPath = path.join(packagePath, '.asset-package.json');
    writeJson(descriptorPath, { ...JSON.parse(fs.readFileSync(descriptorPath, 'utf8')), schema_version: options.packageSchema });
  }
  if (options.packageScope) {
    const descriptorPath = path.join(packagePath, '.asset-package.json');
    writeJson(descriptorPath, { ...JSON.parse(fs.readFileSync(descriptorPath, 'utf8')), asset_scope: options.packageScope });
  }
  if (options.dependencyClosure === false) {
    const descriptorPath = path.join(packagePath, '.asset-package.json');
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
    writeJson(descriptorPath, { ...descriptor, filter_policy: { ...descriptor.filter_policy, dependency_closure: false } });
  }
  if (options.danglingReportRef) {
    const dashboardsPath = path.join(packagePath, 'indexes', 'dashboard-catalog.jsonl');
    const values = fs.readFileSync(dashboardsPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    values[1].report_refs.push({ report_id: 'missing-report', report_name: 'Missing' });
    fs.writeFileSync(dashboardsPath, `${values.map(JSON.stringify).join('\n')}\n`);
  }
  writeJson(planPath, options.plan ?? validPlan);
  const rejected = spawnSync(process.execPath, [generator, '--asset-package', packagePath, '--domain-plan', planPath, '--output', path.join(fixture, 'output')], { encoding: 'utf8' });
  assert.notEqual(rejected.status, 0, name);
  assert.match(rejected.stderr, pattern, name);
}

function assertBuildRejected(name, plan, pattern) {
  const fixture = path.join(temp, `build-rejected-${name.replaceAll(' ', '-')}`);
  const planPath = path.join(fixture, 'plan.json');
  fs.mkdirSync(fixture, { recursive: true });
  writeJson(planPath, plan);
  const rejected = spawnSync(process.execPath, [builder,
    '--asset-package', assetPackage,
    '--semantic-plan', planPath,
    '--output', path.join(fixture, 'output'),
  ], { encoding: 'utf8' });
  assert.notEqual(rejected.status, 0, name);
  assert.match(rejected.stderr, pattern, name);
}

function asset(resourceType, resourceKey, title, fields) {
  return {
    evidence_id: `${resourceType}:${resourceKey}`,
    resource_type: resourceType,
    resource_key: resourceKey,
    title,
    authenticated: true,
    updated_at: '2026-09-01 00:00:00',
    source_detail_path: `details/normalized/${resourceType}/${resourceKey}.json`,
    ...fields,
  };
}

function containerRef(containerKey, containerTitle, containerKind) {
  return { container_key: containerKey, container_title: containerTitle, container_kind: containerKind };
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function writeJsonl(name, values) {
  const all = [{ record_type: 'header', count: values.length }, ...values];
  fs.writeFileSync(path.join(assetPackage, 'indexes', `${name}.jsonl`), `${all.map(JSON.stringify).join('\n')}\n`);
}

function markdownSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start < 0) return '';
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/\n#{1,3}\s/);
  return next < 0 ? rest : rest.slice(0, next);
}

function markdownTopLevelSection(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start < 0) return '';
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/\n##\s/);
  return next < 0 ? rest : rest.slice(0, next);
}

function readTree(directory) {
  const result = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [name, content] of Object.entries(readTree(target))) result[`${entry.name}/${name}`] = content;
    } else result[entry.name] = fs.readFileSync(target, 'utf8');
  }
  return result;
}

function sourceHashByDisplayName(manifest) {
  return Object.fromEntries(manifest.sources.map((source) => [source.display_name, source.content_hash]).sort(([a], [b]) => a.localeCompare(b)));
}
