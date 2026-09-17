import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { RuntimeContext } from '../src/framework/types.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { unwrapOutputData } from '../src/framework/output.js';
import commands, { agentReviewSubmitToPage, agentReviewReview, agentReviewRetry, agentReviewEvidence } from '../src/commands/te-analysis/meta/agent-review/index.js';
import allCommands from '../src/commands/te-analysis/meta/index.js';
import { metadataGovernanceRecommendationExport } from '../src/commands/te-analysis/meta/governance-recommendation/index.js';
import { metadataGovernanceRecommendationSubmit } from '../src/commands/te-analysis/meta/governance-recommendation/submit.js';

const host = 'https://agent-review.example.com';
const batchId = '9007199254740993';
const itemId = '9007199254740994';
const analysisExplanation = {
  business_purpose: '用于审核客户给 Agent 发送消息数量的统计口径。',
  measures: [{ statement: '统计 agent_session_message_receive 事件的消息次数。', evidence_refs: ['evidence_snapshot.analysis.measures[0]'], inferred: false }],
  calculations: [{ statement: '按保存报表定义中的 total_count 聚合为消息总数。', evidence_refs: ['evidence_snapshot.analysis.sql.select_columns[0]'], inferred: false }],
  filters: [],
  time_scope: [],
  dimensions: [],
  query_columns: [],
  limitations: [],
};
const reportEvidence = {
  target_revision: 'definition-hash',
  analysis: {
    measures: [{ event: 'agent_session_message_receive', aggregator: 'count' }],
    sql: { select_columns: [{ alias: 'total_count', expression: 'count(*)' }] },
  },
};
const item = {
  client_item_id: 'report_1', target_ref: { type: 'report', key: '1' }, action_type: 'CERTIFY',
  proposal_payload: { authentication_status: 1 },
  ai_summary: {
    summary: '近 90 天热度 32、使用人数 6，来源看板正在使用该消息数报表，建议审核保存口径后认证。',
    analysis_explanation: analysisExplanation,
  },
  evidence_snapshot: reportEvidence,
  source_link: '/#/tga/event/1_1',
  evidence_links: [{ url: '/#/tga/event/1_1', label: '来源报表' }],
};
const create = {
  'project-id': 1, 'client-request-id': 'proposal_1', title: 'Review', 'source-run-id': 'rec_1',
  'ai-summary': {}, 'presentation-snapshot': {
    topics: [{ id: 'topic', name: '业务主题', groups: [{ id: 'group', name: '二级分类', items: [{ id: 'report_1' }] }] }],
  },
  items: [item],
};
const review = {
  'project-id': 1, 'batch-id': batchId, 'client-request-id': 'decision_1',
  decisions: [{ item_id: itemId, version: 0, decision: 'APPROVE' }],
};
const retry = { 'project-id': 1, 'batch-id': batchId, 'client-request-id': 'retry_1', 'item-ids': [itemId] };

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name: string) => values[name] === undefined ? '' : String(values[name]),
    num: (name: string) => Number(values[name]),
    json: (name: string) => values[name], host: () => host,
  } as RuntimeContext;
}

test('registers seven typed commands and keeps legacy executing submit separate', () => {
  assert.equal(commands.length, 7);
  for (const command of commands) assert.ok(allCommands.includes(command));
  assert.equal(agentReviewSubmitToPage.capabilityId, 'metadata.agent_review.create');
  assert.equal(agentReviewSubmitToPage.risk, 'write');
  assert.equal(metadataGovernanceRecommendationSubmit.capabilityId, 'metadata.governance_recommendation.submit');
  assert.ok(metadataGovernanceRecommendationSubmit.flags.some((flag) => flag.name === 'decisions'));
  assert.ok(!agentReviewSubmitToPage.flags.some((flag) => flag.name === 'decisions'));
});

test('command help text exposes customer and Agent review contracts without local debug notes', () => {
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /Customer\/Agent material package contract/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /review_material_package/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /candidate_assets, heat evidence, source_link\/evidence_links, relations, report definitions, AI-model definitions/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /work_units are deterministic evidence containers from Common/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /not final page groups/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /start with --limit 20/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /expand to --limit 50 then --limit 100 only when the remaining pending review assets or visible business domains are too few/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /daily review capacity target such as 20-50 pending assets/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /hard cap around 80/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /report overflow for later batches/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /Draft only business domains with pending review assets/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /Generate long Agent summaries only for visible business domains and pending review assets/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /Dashboard candidates may include optional space_id\/space_name/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /never invent or require them/);
  assert.match(metadataGovernanceRecommendationExport.helpText ?? '', /agent-review submit-to-page/);

  assert.match(agentReviewSubmitToPage.helpText ?? '', /governance-recommendation export -> Agent builds ai_summary\/presentation_snapshot\/item reasons -> submit-to-page --input-file/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /review page batch and site notification/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /start at top-20 hot dashboards, expand to top-50\/top-100 only when filtering leaves too few pending review assets or visible business domains/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /Target about 20-50 pending assets per daily batch/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /cap around 80/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /record overflow counts\/domains/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /display only business-domain topics that contain pending review assets/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /must not create standalone zero-pending topics/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /Do not author long page-visible AI summaries for hidden topics or pure authenticated context/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /preserve optional space_id\/space_name/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /Not every dashboard has a space/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /Input-file JSON shape/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"presentation_snapshot"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"groups"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"source_link"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"evidence_links"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"analysis_explanation"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"calculations"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /"measures"/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /Scripts may assemble transport JSON and copy evidence/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /not generated boilerplate/);

  const help = [metadataGovernanceRecommendationExport.helpText, agentReviewSubmitToPage.helpText].join('\n');
  assert.doesNotMatch(help, /AE_CLI_CAPABILITY_GATEWAY_DOMAIN/);
  assert.doesNotMatch(help, /127\.0\.0\.1/);
  assert.doesNotMatch(help, /projectId=196|project_id=196|--project-id 196/);
});

test('all commands use Gateway validate/dry-run/execute with CLI token and lossless snake_case input', async () => {
  setCliTokenManual('test-agent-review-token', host);
  const original = globalThis.fetch;
  const calls: Array<{ url: string; input: Record<string, unknown> }> = [];
  const response = { id: batchId, reused: true, review_url: '/review', items: [
    { id: itemId, reused_batch_id: '9007199254740991', reused_item_id: '9007199254740992' },
  ] };
  globalThis.fetch = async (request, init) => {
    const url = String(request);
    assert.match(url, /\/api\/cli\/analysis\/v1\/capabilities\/metadata\.agent_review\./);
    assert.equal(new Headers(init?.headers).get('cli-token'), 'test-agent-review-token');
    calls.push({ url, input: JSON.parse(String(init?.body)).input });
    return new Response(JSON.stringify({ ok: true, data: response }));
  };
  try {
    for (const command of commands) {
      const values = command === agentReviewSubmitToPage ? create : command === agentReviewReview ? review
        : command === agentReviewRetry ? retry : command === agentReviewEvidence
          ? { 'project-id': 1, 'target-type': 'report', 'target-key': itemId }
          : { 'project-id': 1, 'batch-id': batchId };
      await command.validateInput!(ctx(values));
      assert.ok(calls.at(-1)!.url.endsWith('/validate'));
      await command.dryRun!(ctx(values));
      assert.ok(calls.at(-1)!.url.endsWith('/dry-run'));
      const executed = unwrapOutputData(await command.execute(ctx(values)));
      if (command === agentReviewSubmitToPage) {
        assert.equal(executed.review_url, `${host}/review`);
        assert.equal(executed.review_page_url, `${host}/review`);
      } else {
        assert.equal(JSON.stringify(executed), JSON.stringify(response));
      }
      assert.ok(calls.at(-1)!.url.endsWith('/execute'));
      const input = calls.at(-1)!.input;
      assert.equal(input.project_id, 1);
      assert.ok(Object.keys(input).every((key) => /^[a-z][a-z0-9_]*$/.test(key)));
      if (command.command === 'list') assert.equal(input.limit, 20);
      else if (command === agentReviewEvidence) assert.deepEqual(input.target_ref, { type: 'report', key: itemId });
      else if (command !== agentReviewSubmitToPage) assert.equal(input.batch_id, batchId);
    }
    assert.equal(calls.filter((call) => call.url.endsWith('/execute')).length, 7);
    const input = calls[0].input;
    assert.equal(input.review_type, 'ASSET_GOVERNANCE');
    assert.equal(input.schema_version, '1.0');
    assert.equal(input.client_request_id, 'proposal_1');
    assert.ok(!('source_task_id' in input));
    assert.ok(!('decisions' in input));
    await agentReviewSubmitToPage.execute(ctx(create));
    assert.deepEqual(calls.at(-1)!.input, input, 'network replay must preserve the operation key and content');
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});

test('rejects invalid project/IDs, malformed proposals and unsafe decisions before dispatch', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error('unexpected request'); };
  try {
    const invalidCreates = [
      { ...create, 'project-id': 1.5 }, { ...create, 'client-request-id': ' ' },
      { ...create, items: [] }, { ...create, items: [item, item] },
      { ...create, items: [{ ...item, action_type: 'CREATE_METRIC' }] },
      { ...create, items: [{ ...item, proposal_payload: { authentication_status: 0 } }] },
      { ...create, items: [{ ...item, source_link: undefined, evidence_links: undefined }] },
      { ...create, items: [{ ...item, ai_summary: {} }] },
      { ...create, items: [{ ...item, evidence_snapshot: { target_revision: 'definition-hash' } }] },
      { ...create, items: [{ ...item, ai_summary: { summary: item.ai_summary.summary, analysis_explanation: { business_purpose: '只有用途' } } }] },
      { ...create, items: [{ ...item, clientItemId: 'ignored' }] },
      { ...create, items: [{ ...item, target_ref: { type: 'report', key: 1 } }] },
      { ...create, items: [{ ...item, target_ref: { type: 'event_property', key: 'x' } }] },
      { ...create, 'presentation-snapshot': [] },
      { ...create, 'presentation-snapshot': { topics: [{ id: 'topic', items: [{ id: 'report_1' }] }] } },
      { ...create, 'presentation-snapshot': { topics: [{ id: 'topic', name: '业务主题', groups: [{ id: 'group', name: '二级分类', items: [{ id: 'missing' }] }] }] } },
    ];
    for (const values of invalidCreates) await assert.rejects(agentReviewSubmitToPage.dryRun!(ctx(values)));
    for (const decision of [
      { item_id: Number(itemId), version: 1, decision: 'APPROVE' },
      { item_id: itemId, version: -1, decision: 'APPROVE' },
      { item_id: itemId, version: 1, decision: 'DEFER', reason: ' ' },
      { item_id: itemId, version: 1, decision: 'REJECT' },
      { item_id: itemId, version: 1, decision: 'SKIP' },
      { item_id: itemId, version: 1, decision: 'APPROVE', actor: 'other' },
    ]) await assert.rejects(agentReviewReview.validateInput!(ctx({ ...review, decisions: [decision] })));
    await assert.rejects(agentReviewRetry.execute(ctx({ ...retry, 'item-ids': [itemId, itemId] })));
    await assert.rejects(agentReviewRetry.execute(ctx({ ...retry, 'batch-id': '9223372036854775808' })));
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('leaves narrative quality to Agent review and preserves warnings during dispatch', async () => {
  const original = globalThis.fetch;
  const calls: Array<Record<string, unknown>> = [];
  setCliTokenManual('test-agent-review-token', host);
  globalThis.fetch = async (_request, init) => {
    calls.push(JSON.parse(String(init?.body)).input);
    return new Response(JSON.stringify({ ok: true, data: { id: batchId } }));
  };
  try {
    const warning = { summary: '已纠正3次，仍有部分口径说明待确认，提交人工审核；不代表质量检查通过。' };
    for (const summary of [
      '用于支撑业务观察，是否作为认证资产需结合上下文审核。',
      '保存定义摘要：该报表来自热门看板，审核时需按原始 SQL 文本确认选择列，本草稿不改写 SQL。',
    ]) {
      await agentReviewSubmitToPage.execute(ctx({
        ...create, 'ai-summary': warning,
        items: [{ ...item, ai_summary: { ...item.ai_summary, summary } }],
      }));
      assert.deepEqual(calls.at(-1)!.ai_summary, warning);
      assert.deepEqual((calls.at(-1)!.items as typeof item[])[0].evidence_snapshot, reportEvidence);
      assert.equal((calls.at(-1)!.items as typeof item[])[0].ai_summary.summary, summary);
    }
    const repeatedSummaryItems = Array.from({ length: 12 }, (_, index) => ({
      ...item,
      client_item_id: `report_${index}`,
      target_ref: { type: 'report', key: String(index + 1) },
      ai_summary: {
        ...item.ai_summary,
        summary: `报表“报表 ${index + 1}”近90天热度 ${index + 20}，触达 ${index + 2} 位用户，依赖影响度 ${index}; 来源看板持续使用该保存报表，审核人可根据统计方式、筛选条件和时间范围复核认证。`,
      },
    }));
    await agentReviewSubmitToPage.execute(ctx({
      ...create,
      'ai-summary': warning,
      'presentation-snapshot': {
        topics: [{ id: 'topic', name: '业务主题', groups: [{ id: 'group', name: '二级分类', items: repeatedSummaryItems.map((entry) => ({ id: entry.client_item_id })) }] }],
      },
      items: repeatedSummaryItems,
    }));
    assert.deepEqual(calls.at(-1)!.ai_summary, warning);
    assert.equal((calls.at(-1)!.items as typeof item[]).length, 12);

    const distinctSummaries = [
      '该报表用于确认客户版本覆盖情况，保存定义包含版本字段和客户范围，适合先核对正式环境口径。',
      '该报表用于观察集群配置变更，当前定义包含配置项字段，审核时重点看配置来源是否稳定。',
      '该报表用于查看任务流创建活跃，保存指标与任务操作事件相关，适合按业务负责人复核。',
      '该报表用于评估库表管理使用，保存定义引用库表资产事件，审核时需确认资产范围。',
      '该报表用于分析 IDE 使用链路，统计对象是脚本或查询行为，适合确认开发场景口径。',
      '该报表用于监控集成资产流转，定义里包含数据源和集成操作，审核时关注数据接入范围。',
      '该报表用于观察 Agent 对话量，保存定义引用会话消息事件，适合确认消息方向和成员范围。',
      '该报表用于复核排行榜配置使用，统计维度围绕榜单主体，审核时关注模型类型过滤。',
      '该报表用于分析运营页面访问，保存定义引用页面浏览行为，适合确认页面枚举是否完整。',
      '该报表用于查看推送策略触达，定义包含运营策略事件，审核时需确认任务状态筛选。',
      '该报表用于跟踪 SQL 查询入口，保存定义来自查询操作，适合确认参数含义和空间过滤。',
      '该报表用于核对客户私有化信息，保存定义围绕客户和部署属性，审核时关注客户分层。',
    ];
    const repeatedLimitationItems = Array.from({ length: 12 }, (_, index) => ({
      ...item,
      client_item_id: `report_with_limit_${index}`,
      target_ref: { type: 'report', key: String(index + 100) },
      ai_summary: {
        ...item.ai_summary,
        summary: distinctSummaries[index],
        analysis_explanation: {
          ...analysisExplanation,
          limitations: [{ statement: '存在部分保存配置无法完全转写为业务口径，审核时需重点确认报表定义、默认时间范围和筛选条件。', inferred: true, evidence_refs: ['evidence_snapshot.analysis.limitations[0]'] }],
        },
      },
      evidence_snapshot: {
        ...reportEvidence,
        analysis: { ...reportEvidence.analysis, limitations: [{ code: 'CONFIG_FIELD_MISSING' }] },
      },
    }));
    await agentReviewSubmitToPage.execute(ctx({
      ...create,
      'ai-summary': warning,
      'presentation-snapshot': {
        topics: [{ id: 'topic', name: '业务主题', groups: [{ id: 'group', name: '二级分类', items: repeatedLimitationItems.map((entry) => ({ id: entry.client_item_id })) }] }],
      },
      items: repeatedLimitationItems,
    }));
    assert.deepEqual(calls.at(-1)!.ai_summary, warning);
    assert.deepEqual((calls.at(-1)!.items as typeof repeatedLimitationItems)[0].ai_summary, repeatedLimitationItems[0].ai_summary);
    assert.equal(calls.length, 4);
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});

test('Skill separates submission authorization, unattended operation and deduplication', () => {
  const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
  const reference = readFileSync(new URL('../skills/ae-analysis/references/agent_review_submit_to_page.md', import.meta.url), 'utf8');
  assert.match(skill, /may ask whether to submit/);
  assert.match(skill, /If the user declines, do not write or repeatedly suggest submission/);
  assert.match(skill, /preauthorized unattended task may submit review proposals only/);
  assert.match(reference, /Same key with different content is a conflict/);
  assert.match(reference, /ignore incidental new run IDs and timestamps/);
  assert.match(reference, /does not send another notification separately/);
});

test('Skill documents dynamic expansion and pending-only visible topics for recurring recommendations', () => {
  const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
  const exportReference = readFileSync(new URL('../skills/ae-analysis/references/governance_recommendation_export.md', import.meta.url), 'utf8');
  const submitReference = readFileSync(new URL('../skills/ae-analysis/references/agent_review_submit_to_page.md', import.meta.url), 'utf8');

  assert.match(skill, /filter out already completed\/authenticated, deferred, or in-flight assets as pending work/);
  assert.match(skill, /target about 20-50 pending review assets/);
  assert.match(skill, /hard cap around 80/);
  assert.match(skill, /overflow left for later batches/);
  assert.match(skill, /submit only business domains that still contain pending review assets/);
  assert.match(skill, /Do not write long Agent summaries for hidden domains or pure authenticated context/);
  assert.match(skill, /preserve optional location facts from Common/);
  assert.match(skill, /Not every dashboard belongs to a space/);
  assert.match(skill, /missing space fields are valid/);

  assert.match(exportReference, /fewer than about 10 pending review assets/);
  assert.match(exportReference, /fewer than 3 pending business domains/);
  assert.match(exportReference, /Apply the daily review capacity after expansion/);
  assert.match(exportReference, /target about 20-50 pending review assets/);
  assert.match(exportReference, /hard cap around 80/);
  assert.match(exportReference, /Use per-domain quotas/);
  assert.match(exportReference, /Record overflow counts and domains for later batches/);
  assert.match(exportReference, /re-export with `--limit 50`/);
  assert.match(exportReference, /then use `--limit 100`/);
  assert.match(exportReference, /Do not display or submit a zero-pending business domain as standalone work/);
  assert.match(exportReference, /hidden topics or pure authenticated context/);
  assert.match(exportReference, /Preserve optional dashboard `space_id` \/ `space_name`/);
  assert.match(exportReference, /absence is valid because not every dashboard has an owning space/);

  assert.match(submitReference, /filter to pending review work/);
  assert.match(submitReference, /Apply the daily review capacity before drafting/);
  assert.match(submitReference, /never more than about 80/);
  assert.match(submitReference, /Keep overflow counts\/domains/);
  assert.match(submitReference, /visible business domains are insufficient/);
  assert.match(submitReference, /zero-pending domains must not be submitted as standalone page sections/);
  assert.match(submitReference, /Do not submit a business topic whose displayed assets are all authenticated\/completed context/);
  assert.match(submitReference, /preserve optional `space_id` and `space_name`/);
  assert.match(submitReference, /missing space facts must not be invented or treated as a validation failure/);
  assert.match(submitReference, /Hidden domains and pure authenticated context rows/);
});

test('submission preserves Agent priorities, classified comparisons and explicit coverage without deciding quality', async () => {
  const original = globalThis.fetch;
  const sent: Array<Record<string, unknown>> = [];
  setCliTokenManual('test-agent-review-token', host);
  globalThis.fetch = async (_request, init) => {
    sent.push(JSON.parse(String(init?.body)).input);
    return new Response(JSON.stringify({ ok: true, data: { id: batchId } }));
  };
  const priorities = ['HIGH', 'MEDIUM', 'LOW', undefined];
  const classifications = ['POSSIBLE_CONFLICT', 'EQUIVALENT', 'RELATED_DIFFERENT_SCOPE', 'INSUFFICIENT_EVIDENCE'];
  try {
    for (const [index, classification] of classifications.entries()) {
      const items = ['left', 'right'].map((id, side) => {
        const peer = side === 0 ? 'right' : 'left';
        return {
          ...item,
          client_item_id: id,
          target_ref: { type: 'report', key: String(side + 1) },
          ai_summary: {
            ...item.ai_summary,
            recommendation: {
              ...(priorities[index] ? { priority: priorities[index] } : {}),
              priority_reason: priorities[index] ? '测试夹具：按已核实依赖安排审核顺序，不代表认证结论。' : '测试夹具：使用证据缺失，优先级未评估。',
              evidence_refs: ['evidence_snapshot.analysis.measures[0]'],
            },
            comparisons: [{
              other_item_key: peer,
              target_ref: { type: 'report', key: String(side === 0 ? 2 : 1) },
              classification,
              similarities: '测试夹具：双方统计消息事件。',
              differences: '测试夹具：比较已保存聚合定义。',
              impact: '测试夹具：区分审核顺序与认证意见。',
              review_question: '测试夹具：确认是否面向同一业务范围。',
              evidence_refs: [id, peer].map(key => `items[client_item_id=${key}].evidence_snapshot.analysis.measures[0]`),
            }],
            comparison_review: {
              status: index === 3 ? 'PARTIAL' : 'COMPLETE',
              scope: '仅此测试夹具中的两个资产',
              compared_item_keys: [peer],
              reason: '测试传输，不是实际业务判定。',
              missing_evidence: index === 3 ? ['运行时参数未绑定'] : [],
            },
          },
        };
      });
      await agentReviewSubmitToPage.execute(ctx({
        ...create,
        'presentation-snapshot': { topics: [{ id: 'topic', name: '测试主题', groups: [{ id: 'group', name: '测试分类', items: items.map(({ client_item_id }) => ({ id: client_item_id })) }] }] },
        items,
      }));
      const actual = sent.at(-1)!.items as typeof items;
      for (const [position, entry] of actual.entries()) {
        assert.deepEqual(entry.ai_summary, items[position].ai_summary);
        assert.deepEqual(entry.evidence_snapshot, reportEvidence);
        assert.equal(entry.action_type, 'CERTIFY');
        assert.deepEqual(entry.proposal_payload, { authentication_status: 1 });
      }
      assert.ok(!('decisions' in sent.at(-1)!));
    }
    assert.equal(sent.length, 4);
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});

test('Skill routes drafting and independent review to the same priority and comparison contract', () => {
  const references = [
    '../skills/ae-analysis/SKILL.md',
    '../skills/ae-analysis/references/agent_review_submit_to_page.md',
    '../skills/ae-analysis/references/governance_recommendation_export.md',
    '../skills/ae-analysis/references/agent_review_preflight.md',
  ];
  for (const path of references) {
    assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /agent_review_priorities_comparisons\.md/);
  }
  const contract = readFileSync(new URL('../skills/ae-analysis/references/agent_review_priorities_comparisons.md', import.meta.url), 'utf8');
  for (const field of ['priority_reason', 'comparison_review', 'compared_item_keys', 'other_item_key', 'classification', 'evidence_refs']) assert.ok(contract.includes(field));
  for (const classification of ['POSSIBLE_CONFLICT', 'EQUIVALENT', 'RELATED_DIFFERENT_SCOPE', 'INSUFFICIENT_EVIDENCE']) assert.ok(contract.includes(classification));
  assert.match(contract, /same logical-packet correction budget/);
  assert.match(contract, /reciprocal comparisons/);
  assert.match(contract, /LOW means lower review priority/);
  assert.match(contract, /cached dates alone do not prove a fixed historical window/);
  assert.match(contract, /projected\/grouped ID is not necessarily a join key/);
  assert.match(contract, /Missing, null, empty, zero and explicit false are distinct/);
  assert.match(contract, /reconcile the comparison ledger and coverage with the actual peer entries/);
  assert.match(contract, /LOCAL_ONLY always ends with local files/);
  assert.match(agentReviewSubmitToPage.helpText ?? '', /comparison_review/);
});

test('Skill requires actual report calculations and SQL projection evidence rather than purpose alone', () => {
  const reference = readFileSync(new URL('../skills/ae-analysis/references/agent_review_submit_to_page.md', import.meta.url), 'utf8');
  assert.match(reference, /its `review_material_package` is the customer-visible handoff package/);
  assert.match(reference, /Do not ask customers to manually run `analysis report get` for every report/);
  assert.match(reference, /purpose alone is insufficient/);
  for (const section of ['measures', 'dimensions', 'calculations', 'filters', 'time_scope', 'query_columns']) {
    assert.match(reference, new RegExp('\\| `' + section + '`\\s*\\|'));
  }
  assert.match(reference, /Common create stores the submitted packet for page review/);
  assert.match(reference, /does not repair a missing Agent calculation explanation during create/);
  assert.match(reference, /every report item must contain current `evidence_snapshot\.analysis`/);
  assert.match(reference, /missing required analysis or resolvable evidence references still fails structural validation/);
  assert.match(reference, /Common-verifiable paths rooted at `evidence_snapshot\.analysis`/);
  assert.match(reference, /After submission, read detail and check that those paths resolve/);
  assert.match(reference, /explain each SELECT projection in source order/);
  assert.match(reference, /Preserve duplicate aliases and positional identity/);
  assert.match(reference, /unexpanded `SELECT \*`/);
  assert.match(reference, /leave unsupported factual sections empty/);
  assert.match(reference, /`inferred:true`/);
  assert.match(reference, /does not prove the query ran successfully, produced real rows, or certified the asset/);
  assert.match(reference, /Scripts may build the transport file/);
  assert.match(reference, /must not author page-visible `ai_summary\.summary`/);
  assert.match(reference, /same narrative shape after only asset names, dates, or numbers change/);
  assert.match(reference, /narrative-quality checks before dispatch/);
  assert.match(reference, /repeated limitation\/open-question text/);
});

test('submit-to-page accepts a generated draft file and preserves grouped page presentation', async () => {
  const draft = {
    review_type: 'ASSET_GOVERNANCE',
    schema_version: '1.0',
    project_id: 999,
    client_request_id: 'from_file',
    title: 'Material package review',
    source_run_id: 'rec_1',
    ai_summary: { summary: 'Use embedded package evidence.' },
    presentation_snapshot: {
      topics: [{
        id: 'customer-health',
        name: '客户与集群健康',
        groups: [{ id: 'cluster-quality', name: '集群质量', items: [{ id: 'report_1' }] }],
      }],
    },
    items: [item],
  };
  const file = join(mkdtempSync(join(tmpdir(), 'agent-review-draft-')), 'submit-to-page-draft.json');
  writeFileSync(file, JSON.stringify(draft), 'utf8');
  const original = globalThis.fetch;
  const calls: Array<{ url: string; input: Record<string, unknown> }> = [];
  setCliTokenManual('test-agent-review-token', host);
  globalThis.fetch = async (request, init) => {
    calls.push({ url: String(request), input: JSON.parse(String(init?.body)).input });
    return new Response(JSON.stringify({ ok: true, data: { id: batchId } }));
  };
  try {
    await agentReviewSubmitToPage.dryRun!(ctx({
      'project-id': 1,
      'client-request-id': 'proposal_file',
      'input-file': file,
    }));
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /metadata\.agent_review\.create\/dry-run$/);
    assert.equal(calls[0].input.project_id, 1);
    assert.equal(calls[0].input.client_request_id, 'proposal_file');
    assert.deepEqual(calls[0].input.presentation_snapshot, draft.presentation_snapshot);
    assert.deepEqual(calls[0].input.items, draft.items);
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});

test('submit-to-page normalizes local Common links to the public review page host', async () => {
  const localHost = 'http://127.0.0.1:8992';
  const localItem = {
    ...item,
    source_link: 'http://127.0.0.1:8992/#/tga/event/5_7752',
    evidence_links: [{ url: '/#/tga/event/5_7752', label: '来源报表' }],
    evidence_snapshot: {
      ...reportEvidence,
      source_link: 'http://127.0.0.1:8992/#/tga/event/5_7752',
      source_evidence: [{ raw_url: '/#/panel/panel/5_2037', markdown_link: '[来源看板](/#/panel/panel/5_2037)' }],
    },
  };
  const draft = {
    review_type: 'ASSET_GOVERNANCE',
    schema_version: '1.0',
    title: 'Local review',
    source_run_id: 'rec_local',
    ai_summary: { summary: 'Use embedded package evidence.' },
    presentation_snapshot: {
      topics: [{ id: 'topic', name: '业务主题', groups: [{ id: 'group', name: '二级分类', items: [{ id: 'report_1' }] }] }],
    },
    items: [localItem],
  };
  const file = join(mkdtempSync(join(tmpdir(), 'agent-review-local-draft-')), 'submit-to-page-draft.json');
  writeFileSync(file, JSON.stringify(draft), 'utf8');
  const original = globalThis.fetch;
  let capturedInput: Record<string, unknown> | undefined;
  setCliTokenManual('test-agent-review-token', localHost);
  globalThis.fetch = async (_request, init) => {
    capturedInput = JSON.parse(String(init?.body)).input;
    return new Response(JSON.stringify({
      ok: true,
      data: { id: '14', review_url: '/#/data/assetVerify?tab=agentReview&batchId=14&currentProjectId=5' },
    }));
  };
  try {
    const result = unwrapOutputData(await agentReviewSubmitToPage.execute({
      ...ctx({ 'project-id': 5, 'client-request-id': 'local_proposal', 'input-file': file }),
      host: () => localHost,
    }));
    const submittedItem = (capturedInput!.items as any[])[0];
    assert.equal(submittedItem.source_link, 'http://127.0.0.1:10010/#/tga/event/5_7752');
    assert.equal(submittedItem.evidence_links[0].url, 'http://127.0.0.1:10010/#/tga/event/5_7752');
    assert.equal(submittedItem.evidence_snapshot.source_link, 'http://127.0.0.1:10010/#/tga/event/5_7752');
    assert.equal(submittedItem.evidence_snapshot.source_evidence[0].raw_url, 'http://127.0.0.1:10010/#/panel/panel/5_2037');
    assert.equal(submittedItem.evidence_snapshot.source_evidence[0].markdown_link, '[来源看板](http://127.0.0.1:10010/#/panel/panel/5_2037)');
    assert.equal(result.review_url, 'http://127.0.0.1:10010/#/data/assetVerify?tab=agentReview&batchId=14&currentProjectId=5');
    assert.equal(result.review_page_url, 'http://127.0.0.1:10010/#/data/assetVerify?tab=agentReview&batchId=14&currentProjectId=5');
  } finally {
    globalThis.fetch = original;
    clearCliToken(localHost);
  }
});

test('submission preserves structured analysis explanations and refs without executing approval', async () => {
  // Synthetic transport fixture, not evidence from a real report or a server verification test.
  const explanation = Object.fromEntries(['measures', 'dimensions', 'calculations', 'filters', 'time_scope', 'query_columns']
    .map((section) => [section, [{ statement: `Interpretation of ${section}`, inferred: false,
      evidence_refs: [`evidence_snapshot.analysis.${section}[0]`] }]]));
  const values = { ...create, items: [{ ...item, ai_summary: { summary: item.ai_summary.summary, analysis_explanation: explanation } }] };
  const original = globalThis.fetch;
  const calls: Array<{ url: string; input: Record<string, unknown> }> = [];
  setCliTokenManual('test-agent-review-token', host);
  globalThis.fetch = async (request, init) => {
    calls.push({ url: String(request), input: JSON.parse(String(init?.body)).input });
    return new Response(JSON.stringify({ ok: true, data: { validated: true } }));
  };
  try {
    await agentReviewSubmitToPage.dryRun!(ctx(values));
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /metadata\.agent_review\.create\/dry-run$/);
    assert.deepEqual(calls[0].input.items, values.items);
    assert.ok(!('decisions' in calls[0].input));
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
});
