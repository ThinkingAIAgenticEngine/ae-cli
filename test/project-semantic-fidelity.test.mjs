import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scripts = path.resolve(import.meta.dirname, '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-fidelity-'));
  const pkg = path.join(root, 'package');
  const hash = 'a'.repeat(64);
  const write = (file, value) => {
    const target = path.join(pkg, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value));
  };
  const index = (name, rows) => {
    const target = path.join(pkg, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, [{ record_type: 'header' }, ...rows].map(JSON.stringify).join('\n') + '\n');
  };
  const container = { container_key: 'shared_assets', container_title: 'Shared', container_kind: 'shared_assets' };
  const asset = (type, id, title, extra = {}) => ({
    resource_type: type, resource_key: id, evidence_id: `${type}:${id}`, title,
    authenticated: true, source_detail_path: `details/${type}/${id}.json`, ...extra,
  });
  const reports = [asset('report', 'a', 'Capacity estimate', {
    report_model: 10, definition_kind: 'SQL', dashboard_refs: [{ dashboard_id: 'd', dashboard_name: 'Service health' }],
    metric_occurrences: [], calculation_context: { sql: 'select cluster_id, owner AS CSM from inventory where ${PartDate:date1}', parameters: [{ name: 'date1' }, { name: 'CSM' }] },
  }), asset('report', 'b', 'Usage by period', {
    report_model: 0, definition_kind: 'EVENT_ANALYSIS', dashboard_refs: [{ dashboard_id: 'd', dashboard_name: 'Service health' }],
    metric_occurrences: [{ event_name: 'query', display_name: 'Requests', aggregation_code: 'A100', filters: [] }],
    calculation_context: {
      group_by: [{ columnName: 'cluster_id' }, { columnName: 'engines', arrayGroupType: 'array_item_group', columnType: 'array(varchar)' }],
      filters: { relation: 'or', filts: [{ columnName: 'region', calcuSymbol: 'C00', ftv: ['east'] }, { columnName: 'region', calcuSymbol: 'C00', ftv: ['west'] }] },
      time_scope: { recent_day: '0-7', time_particle_size: 'T1' },
    },
  })];
  write('.asset-package.json', { schema_version: '3.0', project_id: 7, snapshot_hash: hash, asset_scope: 'governed', filter_policy: { authenticated_entry_assets_only: true, dependency_closure: true } });
  write('manifest.json', { schema_version: '3.0', project_id: 7 });
  index('indexes/asset-containers.jsonl', [container]);
  index('indexes/dashboard-catalog.jsonl', [asset('dashboard', 'd', 'Service health', { source_container_ref: container, report_refs: reports.map(r => ({ report_id: r.resource_key, report_name: r.title })) })]);
  index('indexes/report-catalog.jsonl', reports);
  index('indexes/metric-catalog.jsonl', []);
  index('metadata/analysis-selectable.jsonl', []);
  index('sources/adopted-personal-semantics.jsonl', []);
  const ref = (type, id) => ({ resource_type: type, resource_key: id, reason: 'Verified source definition' });
  const card = {
    card_id: 'service-capacity', questions: ['Which clusters need follow-up?'], intent: 'Choose capacity evidence and compatible usage evidence.',
    preferred_asset_refs: [ref('report', 'a')], fallback_asset_refs: [ref('report', 'b'), ref('dashboard', 'd')], excluded_asset_refs: [], requires_live_execution: true,
    routing: {
      applicable_when: 'Cluster capacity or usage is requested', answer_grain: 'cluster', required_parameters: ['date1'],
      branches: [
        { when: 'Capacity only', asset_refs: [ref('report', 'a')], reason: 'Capacity estimate by cluster' },
        { when: 'Capacity and usage', asset_refs: [ref('report', 'a'), ref('report', 'b')], reason: 'Validate cluster grain and period before combining' },
        { when: 'Explore service health', asset_refs: [ref('dashboard', 'd')], reason: 'Explore dashboard context' },
      ], stop_when: 'Question scope and authoritative evidence match', fallback_when_unavailable: 'Report the specific missing evidence', evidence_boundary: 'Array expansion and period grain must be checked before joining',
    },
  };
  const plan = {
    schema_version: '2.0', source_snapshot_hash: hash, generation_method: 'agent_semantic_synthesis',
    project_business_model: {
      business_positioning: 'Observe service capacity and usage to guide operational follow-up.', audience_roles: ['Operations'],
      business_objects: [{ object_id: 'cluster', name: 'Cluster', meaning: 'A service deployment', evidence_refs: [ref('report', 'a')] }, { object_id: 'usage', name: 'Usage', meaning: 'Observed service activity', evidence_refs: [ref('report', 'b')] }],
      object_relationships: [{ from_object: 'Cluster', to_object: 'Usage', relationship: 'Usage is observed for a cluster', evidence_refs: [ref('report', 'b')] }],
      decision_chains: [{ chain_id: 'health', title: 'Service health', decision_question: 'Which clusters need follow-up?', signals: ['capacity', 'usage'], decision_steps: ['Verify the required period and cluster identity', 'Read capacity and usage definitions'], preferred_domain_ids: ['service-health'], asset_refs: [ref('report', 'a')], requires_live_execution: true, boundaries: ['Live execution required'] }], non_goals: ['Persisting current result rows'],
    },
    domains: [{ domain_id: 'service-health', title: 'Service health', summary: 'Capacity and usage follow-up', primary_questions: ['Which clusters need follow-up?'], primary_metrics: ['capacity'], drilldown_dimensions: ['cluster'], merge_rationale: 'Shared service objects', dashboard_ids: ['d'],
      domain_judgment_model: { business_state_judged: 'Service capacity health', main_objects: ['cluster'], signals: ['capacity', 'usage'], decision_path: ['Verify capacity and usage', 'Check identity and period compatibility'], asset_attachment_logic: [{ asset_ref: ref('dashboard', 'd'), role: 'primary_entry', reason: 'Dashboard provides the service context' }], boundaries: ['Live execution required'] }, recall_cards: [card] }],
    appendices: [], personal_semantic_integrations: [],
    sql_report_semantics: [{ report_id: 'a', business_purpose: 'Inspect remaining capacity for each service cluster.', statistical_grain: 'One row per cluster', input_parameters: [{ name: 'date1', meaning: 'Observation period', required: true }, { name: 'CSM', meaning: 'Owner filter', required: false }], output_fields: [{ name: 'cluster_id', meaning: 'Stable cluster identity' }, { name: 'CSM', meaning: 'Account owner' }], key_filters: ['Requested observation period'], default_limits: ['No fixed limit'], applicable_questions: ['Remaining cluster capacity'], non_applicable_questions: ['Does not measure usage'], evidence_locator: 'details/report/a.json', definition_state: 'valid' }],
  };
  const planFile = path.join(root, 'plan.json');
  const output = path.join(root, 'wiki');
  function build() {
    fs.writeFileSync(planFile, JSON.stringify(plan));
    execFileSync(process.execPath, [path.join(scripts, 'build-project-semantic-wiki.mjs'), '--asset-package', pkg, '--semantic-plan', planFile, '--output', output, '--force'], { stdio: 'pipe' });
    return output;
  }
  return { root, pkg, reports, plan, build, index, write };
}

test('source compilation preserves parameter and output identities independently', () => {
  const f = fixture();
  try {
    f.plan.sql_report_semantics[0].input_parameters.push({ name: 'selector', meaning: 'Population choice', required: true });
    const output = f.build();
    const page = fs.readFileSync(path.join(output, 'wiki/reports/capacity-estimate-a.md'), 'utf8');
    assert.match(page, /`CSM`：Account owner/);
    assert.match(page, /`date1`/);
    assert.match(page, /`selector`/);
    assert.doesNotMatch(page, /`Owner filter`/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('non-SQL result grain keeps actual groups, arrays, logic and time', () => {
  const f = fixture();
  try {
    const output = f.build();
    const page = fs.readFileSync(path.join(output, 'wiki/reports/usage-by-period-b.md'), 'utf8');
    assert.match(page, /cluster_id/);
    assert.match(page, /engines/);
    assert.match(page, /array_item_group/);
    assert.match(page, /OR/);
    assert.match(page, /0-7/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('intent branches link exact assets and retain a dashboard exploration branch', () => {
  const f = fixture();
  try {
    const output = f.build();
    const page = fs.readFileSync(path.join(output, 'wiki/recall-cards/service-capacity.md'), 'utf8');
    const branches = page.slice(page.indexOf('## 条件路由与停止'), page.indexOf('## 首选资产'));
    assert.match(branches, /\]\(\.\.\/reports\/capacity-estimate-a\.md\)/);
    assert.match(branches, /\]\(\.\.\/reports\/usage-by-period-b\.md\)/);
    assert.match(branches, /\]\(\.\.\/dashboards\/service-health-d\.md\)/);
    assert.match(page, /Measures \(verify result column identities\): Requests/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('incompatible and unproven combinations remain explicit; false join keys fail', () => {
  const f = fixture();
  try {
    const branch = f.plan.domains[0].recall_cards[0].routing.branches[1];
    branch.combination = { compatibility: 'incompatible', reason: 'Usage rows expand by engine; capacity rows are per cluster.' };
    let output = f.build();
    let page = fs.readFileSync(path.join(output, 'wiki/recall-cards/service-capacity.md'), 'utf8');
    assert.match(page, /Combination: incompatible/);
    delete branch.combination;
    output = f.build();
    page = fs.readFileSync(path.join(output, 'wiki/recall-cards/service-capacity.md'), 'utf8');
    assert.match(page, /Combination: unknown/);
    branch.combination = { compatibility: 'compatible', reason: 'Verified population and time', join_keys: ['company_name'], time_alignment: 'Match selected period' };
    assert.throws(() => f.build(), /join key is not an output field/);
    f.plan.sql_report_semantics[0].output_fields.push({ name: 'company_name', meaning: 'Unproven source identity' });
    assert.throws(() => f.build(), /join key has unverified output identity/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('changed SQL explanation updates its recall evidence and dependency tracking', () => {
  const f = fixture();
  try {
    const output = f.build();
    const cardFile = path.join(output, 'wiki/recall-cards/service-capacity.md');
    const before = fs.readFileSync(cardFile, 'utf8');
    f.plan.sql_report_semantics[0].business_purpose = 'Inspect revised remaining capacity for each service cluster.';
    f.build();
    assert.notEqual(fs.readFileSync(cardFile, 'utf8'), before);
    const manifest = JSON.parse(fs.readFileSync(`${output}-kb-upload-sources/kb-upload-manifest.json`, 'utf8'));
    const card = manifest.sources.find(row => row.source_kind === 'recall-card' && row.asset_key === 'service-capacity');
    assert.ok(card.semantic_plan_fragment_refs.includes('report:a:sql_semantics'));
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('unproven output labels are marked unknown instead of becoming SQL identities', () => {
  const f = fixture();
  try {
    f.plan.sql_report_semantics[0].output_fields.push({ name: 'Owner display label', meaning: 'Account owner' });
    const output = f.build();
    const page = fs.readFileSync(path.join(output, 'wiki/reports/capacity-estimate-a.md'), 'utf8');
    assert.match(page, /`Owner display label`.*output identity unverified/);
    assert.match(page, /`CSM`：Account owner/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('formula metrics with the same expression retain distinct operand windows in the primary summary', () => {
  const f = fixture();
  try {
    f.reports[1].metric_occurrences = [7, 30].map(days => ({
      event_name: 'formula', display_name: `Daily / ${days}-day activity`, formula_expression: 'A / B',
      formula_definition: { formulationDeps: [
        { event: { eventName: 'query' }, date: { params: [1] } },
        { event: { eventName: 'query' }, date: { params: [days] } },
      ] },
    }));
    f.index('indexes/report-catalog.jsonl', f.reports);
    const output = f.build();
    const page = fs.readFileSync(path.join(output, 'wiki/reports/usage-by-period-b.md'), 'utf8');
    const summary = page.slice(page.indexOf('主要指标/输出'), page.indexOf('输入参数'));
    assert.match(summary, /Daily \/ 7-day activity/);
    assert.match(summary, /Daily \/ 30-day activity/);
    assert.match(summary, /query/);
    assert.doesNotMatch(summary, /聚合方式未暴露|事件“formula”/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});
