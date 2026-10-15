import assert from 'node:assert/strict';
import test from 'node:test';
import { precompiledSource } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/precompiled-source.mjs';

test('SQL prose remains complete while raw SQL and duplicate index stay local', () => {
  const summary = { summary_kind: 'cli_agent_sql_report_semantic_source', business_purpose: 'Daily revenue', evidence_locator: 'normalized/report/7.json', output_fields: ['day', 'revenue'] };
  const text = '# Revenue\n\ndefinition_state: unknown\nruntime_policy: block\n\n## Meaning\nDaily revenue; USD, paid orders only; excludes refunds. Grain: day.\n```json\n' + JSON.stringify(summary) + '\n```\n## Calculation\n```json\n' + JSON.stringify({ sql: 'SELECT large raw SQL', parameters: [], sql_semantic_facts: {} }) + '\n```\n## \u539f\u59cb\u7d22\u5f15\u8bb0\u5f55\n```json\n{"raw":"duplicate"}\n```\n';
  const result = precompiledSource(text);
  assert.match(result, /USD, paid orders only; excludes refunds/);
  assert.match(result, /runtime_policy: block/);
  assert.match(result, /normalized\/report\/7.json/);
  assert.doesNotMatch(result, /large raw SQL|duplicate|```json/);
});

test('non-SQL calculation facts remain lossless Markdown', () => {
  const result = precompiledSource('# Metric\n```json\n{"formula":"sum(amount) / count(user)","filters":{"paid":true},"timezone":null}\n```');
  assert.match(result, /sum\(amount\) \/ count\(user\)/);
  assert.match(result, /paid: true/);
  assert.match(result, /timezone: unknown/);
});

test('source sync ignores build metadata but detects semantic changes', async () => {
  const { normalizeSourceForHash } = await import('../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/precompiled-source.mjs');
  const first = 'snapshot_hash: abc\nsnapshot_date: 2026-09-11\ncontent_hash: old\n# Report\n- updated_at: yesterday\n- filter: paid\n';
  const next = first.replace('abc', 'def').replace('2026-09-11', '2026-09-12').replace('old', 'new').replace('yesterday', 'today');
  assert.equal(normalizeSourceForHash(first), normalizeSourceForHash(next));
  assert.notEqual(normalizeSourceForHash(first), normalizeSourceForHash(next.replace('filter: paid', 'filter: refunded')));
});

test('source sync ignores semantic conflict candidate ordering only', async () => {
  const { normalizeSourceForHash } = await import('../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/precompiled-source.mjs');
  const first = '## 语义冲突\n\n- B：语义“账户id”存在 2 个元数据候选，但口径不同：“账户ID”（id=#account_id，事件属性 #account_id table_type=0）；“账户ID”（id=#account_id，用户属性 #account_id table_type=1）。Agent 不应仅凭名称选择，需要优先使用业务域/召回卡或让用户确认。\n- A：语义“用户id”存在 2 个元数据候选，但口径不同：“用户ID”（id=#user_id，事件属性 #user_id table_type=0）；“用户ID”（id=#user_id，用户属性 #user_id table_type=1）。Agent 不应仅凭名称选择，需要优先使用业务域/召回卡或让用户确认。\n\n## 缺少源标题的元数据\n\n- `z`\n- `a`\n';
  const reordered = '## 语义冲突\n\n- A：语义“用户id”存在 2 个元数据候选，但口径不同：“用户ID”（id=#user_id，用户属性 #user_id table_type=1）；“用户ID”（id=#user_id，事件属性 #user_id table_type=0）。Agent 不应仅凭名称选择，需要优先使用业务域/召回卡或让用户确认。\n- B：语义“账户id”存在 2 个元数据候选，但口径不同：“账户ID”（id=#account_id，用户属性 #account_id table_type=1）；“账户ID”（id=#account_id，事件属性 #account_id table_type=0）。Agent 不应仅凭名称选择，需要优先使用业务域/召回卡或让用户确认。\n\n## 缺少源标题的元数据\n\n- `a`\n- `z`\n';
  assert.equal(normalizeSourceForHash(first), normalizeSourceForHash(reordered));
  assert.notEqual(normalizeSourceForHash(first), normalizeSourceForHash(reordered.replace('table_type=1', 'table_type=2')));
});
