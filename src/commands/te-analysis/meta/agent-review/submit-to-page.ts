import { readFileSync } from 'node:fs';

import { createAnalysisMetaCapabilityCommand } from '../../capability-shared.js';
import { array, clientRequestFlag, fields, object, projectFlag, projectInput, text, unique } from './shared.js';
import { normalizeResourceUrlFields, normalizeResourceUrls, resolvePublicWebHost } from '../../../../core/resource-url.js';

const supportedTargetTypes = new Set([
  'dashboard',
  'report',
  'event',
  'event_prop',
  'user_prop',
  'user_tag',
  'user_cluster',
  'metric',
]);

const SUBMIT_TO_PAGE_HELP = [
  'Customer/Agent review-page draft contract:',
  '- Normal flow: governance-recommendation export -> Agent builds ai_summary/presentation_snapshot/item reasons -> submit-to-page --input-file -> review page batch and site notification.',
  '- This command creates an asset certification review draft for humans. It never approves, certifies, retries, or creates metrics.',
  '- Use --input-file for real drafts. The file is JSON; --project-id and --client-request-id come from CLI flags so replays keep one stable operation key.',
  '- Build the file from review_material_package, preserving candidate assets, heat evidence, source_link/evidence_links, relations, report/AI-model definitions, target_revision, and hashes.',
  '- For dashboard items, preserve optional space_id/space_name from the material package into evidence_snapshot.definition.config when present. Not every dashboard has a space; do not invent or require one.',
  '- For recurring recommendation jobs, build the draft from the latest sufficient export: start at top-20 hot dashboards, expand to top-50/top-100 only when filtering leaves too few pending review assets or visible business domains, and record the final scope in batch ai_summary.',
  '- Expansion is for coverage, not unlimited workload. Target about 20-50 pending assets per daily batch, cap around 80, and balance roughly 3-6 visible domains with per-domain quotas before adding context.',
  '- If more pending candidates exist, submit the ranked slice and record overflow counts/domains in batch ai_summary for later batches.',
  '- presentation_snapshot should display only business-domain topics that contain pending review assets. Authenticated/completed assets may appear as context under those topics, but must not create standalone zero-pending topics.',
  '- Do not author long page-visible AI summaries for hidden topics or pure authenticated context. Copy evidence, links, signals, and relations for context; spend Agent interpretation on visible domains and pending review assets.',
  '- Scripts may assemble transport JSON and copy evidence, but page-visible ai_summary and analysis_explanation text must be Agent-written interpretation from verified evidence, not generated boilerplate.',
  '- Follow agent_review_preflight.md: independent Agent review, at most 3 corrections, then submit with unresolved-quality warnings only when already authorized. LOCAL_ONLY never submits. Business meaning and visible-text quality are Agent review responsibilities; this command enforces only transport structure and evidence references.',
  '- Follow agent_review_priorities_comparisons.md: item ai_summary includes recommendation.priority/priority_reason/evidence_refs, classified comparisons with both-side evidence, and comparison_review coverage. LOW is review urgency, not a defer decision; only POSSIBLE_CONFLICT merits a conflict badge. These assessments share the same 3-correction budget.',
  '- presentation_snapshot.topics is one or more business-domain topics. Each topic must use groups[].items; do not use top-level topics[].items or raw Common work_units as the page grouping.',
  '- relations should let the page render dashboard -> report -> metadata with contains/uses edges. Use an empty relations array only when the package truly has no known parent-child evidence.',
  '- Each submitted item must keep source_link or evidence_links[].url so reviewers can jump to source evidence.',
  '- item.ai_summary.summary is the per-item recommendation reason. It must cite concrete item evidence, not generic review boilerplate. batch ai_summary.summary is only the batch overview.',
  '- For reports and SQL reports, item.ai_summary.analysis_explanation must explain reviewer-readable calculations or measures from packaged evidence_snapshot.analysis. A purpose-only summary is incomplete and is rejected locally before dispatch.',
  '- Reviewer-visible text should follow the project-KB source style: one business Chinese Agent summary that explains purpose, calculation caliber, filters, time scope, boundaries, and concrete reviewer questions. Keep raw SQL, parser labels, temporary aliases, parameter placeholders, hashes, and evidence paths in evidence_snapshot only; independent Agent preflight flags visible implementation terms as quality findings.',
  '- The command output includes review_page_url when review_url is present. Return review_page_url to the user; do not prepend the Common/API host to review_url yourself.',
  '',
  'Input-file JSON shape:',
  '{',
  '  "review_type": "ASSET_GOVERNANCE",',
  '  "schema_version": "1.0",',
  '  "title": "<review batch title>",',
  '  "source_run_id": "<export.run_id>",',
  '  "source_task_id": "<optional preauthorized task id>",',
  '  "ai_summary": { "summary": "<batch overview>" },',
  '  "presentation_snapshot": {',
  '    "project": { "id": 1, "name": "<project name>" },',
  '    "evidenceDate": "YYYY-MM-DD",',
  '    "topics": [{',
  '      "id": "<business-domain-id>",',
  '      "name": "<business-domain-name>",',
  '      "groups": [{',
  '        "id": "<second-level-group-id>",',
  '        "name": "<second-level group or source dashboard>",',
  '        "items": [{ "id": "<client_item_id>" }]',
  '      }]',
  '    }],',
  '    "relations": [{ "parent": "<dashboard item id>", "child": "<report item id>", "type": "contains" }, { "parent": "<report item id>", "child": "<metadata item id>", "type": "uses" }],',
  '    "analysisByItem": {}',
  '  },',
  '  "items": [{',
  '    "client_item_id": "<stable item id used by presentation_snapshot>",',
  '    "target_ref": { "type": "dashboard|report|event|event_prop|user_prop|user_tag|user_cluster|metric", "key": "<lossless target key>" },',
  '    "action_type": "CERTIFY",',
  '    "proposal_payload": { "authentication_status": 1 },',
  '    "source_link": "<copied source URL>",',
  '    "evidence_links": [{ "label": "<source label>", "url": "<copied evidence URL>" }],',
  '    "evidence_snapshot": { "analysis": "<Common packaged evidence when available>", "target_revision": "<definition version/hash>" },',
  '    "ai_summary": {',
  '      "summary": "<item reason with evidence basis and risks>",',
  '      "analysis_explanation": {',
  '        "business_purpose": "<what the reviewer uses this asset for>",',
  '        "measures": [{ "statement": "<measure explanation>", "evidence_refs": ["evidence_snapshot.analysis..."], "inferred": false }],',
  '        "calculations": [{ "statement": "<formula or aggregation explanation>", "evidence_refs": ["evidence_snapshot.analysis..."], "inferred": false }],',
  '        "filters": [], "time_scope": [], "dimensions": [], "query_columns": [],',
  '        "limitations": [], "open_questions": []',
  '      }',
  '    }',
  '  }]',
  '}',
].join('\n');

export const agentReviewSubmitToPage = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'submit-to-page', capabilityId: 'metadata.agent_review.create',
  description: 'Submit evidence-backed asset proposals to a review page without approving or certifying assets.',
  helpText: SUBMIT_TO_PAGE_HELP,
  risk: 'write',
  flags: [
    projectFlag, clientRequestFlag,
    { name: 'input-file', type: 'string', required: false, sensitive: true, desc: 'Local JSON draft generated from review_material_package; includes ai_summary, presentation_snapshot.topics[].groups, copied evidence/source links, and items.' },
    { name: 'title', type: 'string', required: false, desc: 'Review batch title.' },
    { name: 'source-run-id', type: 'string', required: false, desc: 'Evidence run that produced this proposal.' },
    { name: 'source-task-id', type: 'string', desc: 'Optional preauthorized task ID.' },
    { name: 'ai-summary', type: 'json', required: false, desc: 'Evidence-backed batch summary object.' },
    { name: 'presentation-snapshot', type: 'json', required: false, desc: 'Review page packet with business-domain topics, groups[].items, relations, stable client_item_id references, and real evidence links.' },
    { name: 'items', type: 'json', required: false, desc: '1 to 5000 CERTIFY proposals with client_item_id, target_ref, source/evidence links, proposal_payload, item ai_summary/reasons, and evidence_snapshot.' },
  ],
  buildInput: (ctx) => {
    const publicWebHost = resolvePublicWebHost(ctx.host());
    const file = ctx.str('input-file');
    if (file) {
      const input = object(JSON.parse(readFileSync(file, 'utf8')), '--input-file');
      return normalizeSubmitInput(validateInput({
        ...input,
        ...projectInput(ctx),
        client_request_id: text(ctx, 'client-request-id'),
      }), publicWebHost, ctx.host());
    }
    const title = text(ctx, 'title');
    const sourceRunId = text(ctx, 'source-run-id');
    if (!title || !sourceRunId || !ctx.str('ai-summary') || !ctx.str('presentation-snapshot') || !ctx.str('items')) {
      throw new Error('Pass --input-file, or pass --title, --source-run-id, --ai-summary, --presentation-snapshot, and --items together.');
    }
    return normalizeSubmitInput(validateInput({
      ...projectInput(ctx), review_type: 'ASSET_GOVERNANCE', schema_version: '1.0',
      client_request_id: text(ctx, 'client-request-id'), title,
      source_run_id: sourceRunId,
      ...(ctx.str('source-task-id') ? { source_task_id: text(ctx, 'source-task-id') } : {}),
      ai_summary: object(ctx.json('ai-summary'), '--ai-summary'),
      presentation_snapshot: object(ctx.json('presentation-snapshot'), '--presentation-snapshot'),
      items: ctx.json('items'),
    }), publicWebHost, ctx.host());
  },
  postProcess: (result, _input, ctx) => normalizeSubmitResult(result, resolvePublicWebHost(ctx.host()), ctx.host()),
});

function validateInput(input: Record<string, unknown>): Record<string, unknown> {
  const items = array(input.items, 'items').map((value) => {
    const item = object(value, 'items[]');
    fields(item, ['client_item_id', 'target_ref', 'action_type', 'proposal_payload', 'ai_summary',
      'evidence_snapshot', 'source_link', 'evidence_links'], 'items[]');
    if (typeof item.client_item_id !== 'string' || !item.client_item_id.trim()) {
      throw new Error('items[].client_item_id must be a nonempty string.');
    }
    const target = object(item.target_ref, 'items[].target_ref');
    const targetType = typeof target.type === 'string' ? target.type.trim() : '';
    const targetKey = typeof target.key === 'string' ? target.key.trim() : '';
    if (!targetType || !targetKey) {
      throw new Error('items[].target_ref requires nonempty string type and key.');
    }
    if (!supportedTargetTypes.has(targetType)) {
      throw new Error('items[].target_ref.type must be one of dashboard, report, event, event_prop, user_prop, user_tag, user_cluster, metric.');
    }
    const proposal = object(item.proposal_payload, 'items[].proposal_payload');
    fields(proposal, ['authentication_status'], 'items[].proposal_payload');
    if (item.action_type !== 'CERTIFY' || proposal.authentication_status !== 1) {
      throw new Error('Only CERTIFY with authentication_status=1 is supported by the review page.');
    }
    const aiSummary = object(item.ai_summary, 'items[].ai_summary');
    const evidenceSnapshot = object(item.evidence_snapshot, 'items[].evidence_snapshot');
    validateItemAiSummary(aiSummary, `items[${String(item.client_item_id)}].ai_summary`);
    if (targetType === 'report') {
      validateReportAnalysis(aiSummary, evidenceSnapshot, `items[${String(item.client_item_id)}]`);
    }
    validateEvidenceLinks(item);
    return item;
  });
  unique(items.map((item) => item.client_item_id), 'client_item_id');
  fields(input, ['project_id', 'review_type', 'schema_version', 'client_request_id', 'title',
    'source_run_id', 'source_task_id', 'ai_summary', 'presentation_snapshot', 'items'], 'submit-to-page input');
  object(input.ai_summary, 'ai_summary');
  validatePresentation(object(input.presentation_snapshot, 'presentation_snapshot'), new Set(items.map((item) => item.client_item_id)));
  if (input.review_type !== 'ASSET_GOVERNANCE' || input.schema_version !== '1.0') {
    throw new Error('submit-to-page input requires review_type=ASSET_GOVERNANCE and schema_version=1.0.');
  }
  return { ...input, items };
}

function validateItemAiSummary(aiSummary: Record<string, unknown>, name: string): void {
  if (!meaningfulText(aiSummary.summary)) {
    throw new Error(`${name}.summary must be a nonempty string.`);
  }
}

function validateReportAnalysis(
  aiSummary: Record<string, unknown>,
  evidenceSnapshot: Record<string, unknown>,
  name: string,
): void {
  const analysis = object(evidenceSnapshot.analysis, `${name}.evidence_snapshot.analysis`);
  if (!meaningfulText(evidenceSnapshot.target_revision)) {
    throw new Error(`${name}.evidence_snapshot.target_revision is required for report drafts.`);
  }
  const explanation = object(aiSummary.analysis_explanation, `${name}.ai_summary.analysis_explanation`);
  const evidenceRefs = [
    ...explanationRows(explanation.measures, `${name}.ai_summary.analysis_explanation.measures`),
    ...explanationRows(explanation.calculations, `${name}.ai_summary.analysis_explanation.calculations`),
  ]
    .filter((row) => meaningfulText(row.statement))
    .flatMap((row) => evidenceRefList(row.evidence_refs));
  if (!evidenceRefs.some((ref) => resolvesAnalysisPath(analysis, ref))) {
    throw new Error(`${name} report analysis_explanation requires calculations or measures with resolvable evidence_snapshot.analysis refs.`);
  }
}

function explanationRows(value: unknown, name: string): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${name} must be an array.`);
  return value.map((entry) => object(entry, `${name}[]`));
}

function evidenceRefList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function meaningfulText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolvesAnalysisPath(analysis: Record<string, unknown>, path: string): boolean {
  const prefix = 'evidence_snapshot.analysis';
  if (path === prefix) return true;
  if (!path.startsWith(`${prefix}.`) && !path.startsWith(`${prefix}[`)) return false;
  const suffix = path.slice(prefix.length);
  const matcher = /(?:\.([A-Za-z0-9_$-]+)|\[(\d+)\])/g;
  let index = 0;
  let current: unknown = analysis;
  for (let match = matcher.exec(suffix); match; match = matcher.exec(suffix)) {
    if (match.index !== index) return false;
    index += match[0].length;
    const [, key, arrayIndex] = match;
    if (arrayIndex !== undefined) {
      if (!Array.isArray(current)) return false;
      current = current[Number(arrayIndex)];
    } else {
      if (current === null || typeof current !== 'object' || Array.isArray(current)) return false;
      current = (current as Record<string, unknown>)[key];
    }
    if (current === undefined) return false;
  }
  return index === suffix.length;
}

function validateEvidenceLinks(item: Record<string, unknown>): void {
  const sourceLink = typeof item.source_link === 'string' && item.source_link.trim();
  let evidenceLink = false;
  if ('evidence_links' in item) {
    evidenceLink = array(item.evidence_links, 'items[].evidence_links').some((value) => {
      const link = object(value, 'items[].evidence_links[]');
      return typeof link.url === 'string' && !!link.url.trim();
    });
  }
  if (!sourceLink && !evidenceLink) {
    throw new Error('items[] must include source_link or evidence_links[].url so reviewers can open source evidence.');
  }
}

function validatePresentation(presentation: Record<string, unknown>, itemIds: Set<unknown>): void {
  const displayed = new Set<string>();
  for (const topicValue of array(presentation.topics, 'presentation_snapshot.topics')) {
    const topic = object(topicValue, 'presentation_snapshot.topics[]');
    if ('items' in topic) {
      throw new Error('presentation_snapshot.topics[] must use groups[].items, not top-level items.');
    }
    for (const groupValue of array(topic.groups, 'presentation_snapshot.topics[].groups')) {
      const group = object(groupValue, 'presentation_snapshot.topics[].groups[]');
      if (typeof group.id !== 'string' || !group.id.trim()
        || typeof group.name !== 'string' || !group.name.trim()) {
        throw new Error('presentation_snapshot.topics[].groups[] requires nonempty string id and name.');
      }
      for (const itemValue of array(group.items, 'presentation_snapshot.topics[].groups[].items')) {
        const item = object(itemValue, 'presentation_snapshot.topics[].groups[].items[]');
        if (typeof item.id !== 'string' || !item.id.trim()) {
          throw new Error('presentation_snapshot display items require nonempty string id.');
        }
        if (!itemIds.has(item.id)) {
          throw new Error('presentation_snapshot references an unknown client_item_id.');
        }
        displayed.add(item.id);
      }
    }
  }
  for (const id of itemIds) {
    if (!displayed.has(String(id))) {
      throw new Error('presentation_snapshot must display every submitted item under topics[].groups[].items.');
    }
  }
}

function normalizeSubmitInput(
  input: Record<string, unknown>,
  publicWebHost: string,
  sourceHost: string,
): Record<string, unknown> {
  normalizeResourceUrlFields(input, publicWebHost, sourceHost);
  return input;
}

function normalizeSubmitResult(result: unknown, publicWebHost: string, sourceHost: string): unknown {
  normalizeResourceUrlFields(result, publicWebHost, sourceHost);
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const data = result as Record<string, unknown>;
    if (typeof data.review_url === 'string' && data.review_url.trim()) {
      data.review_page_url = normalizeResourceUrls(data.review_url, publicWebHost, sourceHost);
    }
  }
  return result;
}
