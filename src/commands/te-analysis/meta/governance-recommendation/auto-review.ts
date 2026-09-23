import { randomUUID } from 'node:crypto';
import type { Command, Flag, RuntimeContext } from '../../../../framework/types.js';
import {
  compactInput,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import {
  dryRunCapability,
  executeCapabilityWithEnvelope,
  validateCapability,
  validateCapabilityWithEnvelope,
} from '../../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../../core/capability-routing.js';
import { withOutputMetadata } from '../../../../framework/output.js';

const windowDaysFlag: Flag = {
  name: 'window-days',
  type: 'number',
  required: false,
  min: 1,
  max: 365,
  desc: 'Usage window in days for the recommendation batch. Default: 90.',
};

const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  min: 1,
  max: 100,
  desc: 'Maximum hot dashboard evidence packages selected before automatic asset review. Omit for CLI bounded expansion over top-20/top-50/top-100; pass explicitly for a fixed diagnostic scope.',
};

const GOVERNANCE_RECOMMENDATION_AUTO_REVIEW_HELP = [
  'Automatic asset certification contract:',
  '- Use this command only when the user explicitly asks to automatically review or automatically certify recommended assets.',
  '- Do not call this command for a plain recommendation request.',
  '- Do not call this command when the user asks to submit recommendations to the review page.',
  '- The command first validates project config agent_auto_asset_certification_enabled and project_semantic_enable. If disabled, report the returned config error and stop before collecting recommendations.',
  '- When --limit is omitted, the CLI performs the same bounded expansion used by recurring page-review jobs: inspect top-20 pending material, then top-50/top-100 only when pending assets or pending dashboard branches are insufficient.',
  '- Expansion is read-only. The CLI Agent builds automatic decisions once from the final selected material, then submits those decisions for execution and audit.',
  '- When --limit is explicitly provided, respect that scope and do not expand it.',
  '- Automatic review only certifies eligible asset candidates from the current recommendation batch. It does not create recommended metrics.',
  '- CLI Agent blocks semantic duplicates, copy-like assets, synonym properties and ambiguous close definitions; every duplicate skip must name the conflicting asset targets.',
  '- The result includes manual_review_handoff for assets still uncertified after automatic review. Use it only when the user later asks to submit those assets to the review page.',
  '- For that later page submission, build the review packet from manual_review_handoff.page_review_items and relations so skipped assets keep their dashboard/report parent context; manual_review_handoff.items remains the exact unapproved review workload.',
  '- Automatic decisions are recorded for audit. Page-visible reasons must be reviewer-readable Chinese; keep raw source/rule codes only in debug exports.',
  '- Returned SKIP decisions mean the asset remains for manual review; do not describe skipped items as certified.',
].join('\n');

const AUTO_REVIEW_CAPABILITY_ID = 'metadata.governance_recommendation.auto_review';
const EXPORT_CAPABILITY_ID = 'metadata.governance_recommendation.export';
const SUBMIT_CAPABILITY_ID = 'metadata.governance_recommendation.submit';
const DEFAULT_LIMIT = 20;
const EXPANSION_LIMITS = [20, 50, 100] as const;
const MIN_PENDING_ASSETS = 10;
const MIN_PENDING_WORK_UNITS = 3;
const AUTO_REVIEW_DECISION_LIMIT = 100;
const AUTO_REVIEW_MIN_HEAT = 50;
const AUTO_REVIEW_MIN_USERS = 5;
const AUTO_REVIEW_MIN_IMPACT = 2;

export const metadataGovernanceRecommendationAutoReview: Command = {
  service: 'analysis-meta',
  resource: 'governance-recommendation',
  command: 'auto-review',
  capabilityId: AUTO_REVIEW_CAPABILITY_ID,
  description: 'Automatically review and certify eligible recommended assets when the project switch is enabled.',
  helpText: GOVERNANCE_RECOMMENDATION_AUTO_REVIEW_HELP,
  flags: [projectIdFlag, windowDaysFlag, limitFlag],
  risk: 'write',
  preflight: (ctx) => {
    autoReviewInput(ctx);
  },
  validateInput: async (ctx) => validateCapability(ctx.host(), gatewayDomain(), AUTO_REVIEW_CAPABILITY_ID,
    autoReviewInput(ctx)),
  dryRun: async (ctx) => dryRunCapability(ctx.host(), gatewayDomain(), AUTO_REVIEW_CAPABILITY_ID,
    autoReviewInput(ctx)),
  execute: async (ctx) => {
    const input = autoReviewInput(ctx);
    if (hasExplicitLimit(ctx)) {
      await validateCapabilityWithEnvelope(ctx.host(), gatewayDomain(), AUTO_REVIEW_CAPABILITY_ID, input);
      const finalExport = await exportRecommendationMaterial(ctx, input, numberValue(input.limit) || DEFAULT_LIMIT);
      const result = await executeCliAgentAutoReview(ctx, input, finalExport.data);
      return withOutputMetadata({
        ...record(result.data),
        manual_review_handoff: buildManualReviewHandoff(result.data, finalExport.data),
      }, result.meta);
    }

    const plan = await planBoundedExpansion(ctx, input);
    const expansion = plan.expansion;
    const finalInput = { ...input, limit: expansion.final_limit };
    const result = await executeCliAgentAutoReview(ctx, finalInput, plan.finalExport);
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      return withOutputMetadata({
        ...(result.data as Record<string, unknown>),
        auto_review_expansion: expansion,
        manual_review_handoff: buildManualReviewHandoff(result.data, plan.finalExport),
      }, result.meta);
    }
    return withOutputMetadata(result.data, result.meta);
  },
};

function autoReviewInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    window_days: optionalNumber(ctx, 'window-days'),
    limit: optionalNumber(ctx, 'limit'),
  });
}

function gatewayDomain(): string {
  return resolveGatewayDomain('analysis-meta', 'analysis');
}

function hasExplicitLimit(ctx: RuntimeContext): boolean {
  return typeof ctx.has === 'function' ? ctx.has('limit') : ctx.str('limit') !== '';
}

async function executeCliAgentAutoReview(ctx: RuntimeContext, input: Record<string, unknown>, exportResult: unknown) {
  const review = buildCliAgentAutoReview(input, exportResult);
  if (review.decisions.length === 0) {
    return {
      data: {
        ...review.base,
        total: 0,
        applied: 0,
        recorded: 0,
        failed: 0,
        items: [],
      },
      meta: {},
    };
  }
  const submitted = await executeCapabilityWithEnvelope(ctx.host(), gatewayDomain(), SUBMIT_CAPABILITY_ID, {
    ...input,
    run_id: review.runId,
    snapshot_hash: review.snapshotHash,
    topic_id: 'agent_auto_asset_certification',
    topic_name: 'Agent 自动认证资产',
    decisions: review.decisions,
  });
  const submittedData = record(submitted.data);
  return {
    data: {
      ...review.base,
      total: submittedData.total,
      applied: submittedData.applied,
      recorded: submittedData.recorded,
      failed: submittedData.failed,
      items: autoReviewItemsWithDisplayReason(submittedData.items),
    },
    meta: submitted.meta,
  };
}

async function planBoundedExpansion(
  ctx: RuntimeContext,
  input: Record<string, unknown>,
): Promise<{ expansion: Record<string, unknown>; finalExport: unknown }> {
  await validateCapabilityWithEnvelope(ctx.host(), gatewayDomain(), AUTO_REVIEW_CAPABILITY_ID, {
    ...input,
    limit: DEFAULT_LIMIT,
  });

  const attempts: Array<Record<string, unknown>> = [];
  let finalExport: unknown = {};
  let finalLimit = DEFAULT_LIMIT;
  let stopReason = 'top_100_inspected';
  for (const limit of EXPANSION_LIMITS) {
    const exported = await exportRecommendationMaterial(ctx, input, limit);
    finalExport = exported.data;
    const summary = summarizeExport(exported.data, limit);
    attempts.push(summary);
    finalLimit = limit;
    const pendingAssets = numberValue(summary.pending_asset_candidates);
    const pendingWorkUnits = numberValue(summary.pending_work_units);
    const hasMore = summary.has_more === true;
    if (pendingAssets >= MIN_PENDING_ASSETS && pendingWorkUnits >= MIN_PENDING_WORK_UNITS) {
      stopReason = 'sufficient_pending_scope';
      break;
    }
    if (!hasMore) {
      stopReason = 'dashboard_pool_exhausted';
      break;
    }
  }

  return {
    expansion: {
      strategy: 'bounded_hot_dashboard_expansion',
      initial_limit: DEFAULT_LIMIT,
      final_limit: finalLimit,
      inspected_limits: attempts.map((attempt) => attempt.dashboard_limit),
      min_pending_asset_candidates: MIN_PENDING_ASSETS,
      min_pending_work_units: MIN_PENDING_WORK_UNITS,
      attempts,
      stop_reason: stopReason,
      write_policy: 'single_auto_review_execute_after_read_only_expansion',
    },
    finalExport,
  };
}

function exportRecommendationMaterial(ctx: RuntimeContext, input: Record<string, unknown>, limit: number) {
  return executeCapabilityWithEnvelope(ctx.host(), gatewayDomain(), EXPORT_CAPABILITY_ID,
    compactInput({ ...input, limit, include_completed: false }));
}

function summarizeExport(result: unknown, requestedLimit: number): Record<string, unknown> {
  const data = record(result);
  const workUnits = array(data.work_units);
  const coverage = record(data.coverage);
  const pendingAssetCandidates = countPendingAssetCandidates(workUnits);
  return {
    dashboard_limit: numberValue(data.dashboard_limit) || requestedLimit,
    run_id: stringValue(data.run_id),
    snapshot_hash: stringValue(data.snapshot_hash),
    selected_dashboards: numberValue(coverage.selected_dashboards),
    returned_work_units: workUnits.length,
    pending_work_units: workUnits.filter((unit) => numberValue(record(unit).actionable_count) > 0).length,
    pending_asset_candidates: pendingAssetCandidates,
    has_more: coverage.has_more === true,
  };
}

function countPendingAssetCandidates(workUnits: unknown[]): number {
  const seen = new Set<string>();
  for (const unit of workUnits) {
    for (const candidate of array(record(unit).asset_candidates)) {
      const item = record(candidate);
      if (item.actionable !== true || item.action_state !== 'PENDING') {
        continue;
      }
      const type = stringValue(item.resource_type);
      const key = stringValue(item.resource_key);
      if (type && key) {
        seen.add(`${type}|${key}`);
      }
    }
  }
  return seen.size;
}

function buildCliAgentAutoReview(input: Record<string, unknown>, exportResult: unknown): {
  runId: string;
  snapshotHash: string | undefined;
  decisions: Record<string, unknown>[];
  base: Record<string, unknown>;
} {
  const exported = record(exportResult);
  const material = record(exported.review_material_package);
  const candidates = array(material.candidate_assets).map(record);
  const runId = `rec_auto_${randomUUID().replace(/-/g, '')}`;
  const snapshotHash = stringValue(exported.snapshot_hash);
  const semanticConflicts = semanticDuplicateConflicts(candidates);
  const decisions: Record<string, unknown>[] = [];
  let approved = 0;
  let skipped = 0;
  let overflow = 0;
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const target = record(candidate.target_ref);
    const type = stringValue(target.type);
    const key = stringValue(target.key);
    if (!type || !key || !seen.add(`${type}|${key}`)) continue;
    if (candidate.actionable !== true || candidate.action_state !== 'PENDING') continue;
    if (decisions.length >= AUTO_REVIEW_DECISION_LIMIT) {
      overflow++;
      continue;
    }
    const verdict = cliAgentAutoReviewVerdict(candidate, semanticConflicts.get(`${type}|${key}`));
    if (verdict.decision === 'APPROVE') approved++;
    else skipped++;
    decisions.push({
      item_type: 'asset',
      decision: verdict.decision,
      resource_type: type,
      resource_key: key,
      evidence_hash: candidate.evidence_hash,
      reason: verdict.reason,
    });
  }
  return {
    runId,
    snapshotHash,
    decisions,
    base: {
      schema_version: '1.0',
      run_id: runId,
      project_id: input.project_id ?? exported.project_id,
      window_days: input.window_days ?? exported.window_days,
      dashboard_limit: input.limit ?? exported.dashboard_limit,
      snapshot_hash: snapshotHash,
      rule_version: 'agent_auto_asset_certification_v1',
      config_key: 'agent_auto_asset_certification_enabled',
      semantic_config_key: 'project_semantic_enable',
      auto_approved: approved,
      skipped,
      overflow,
    },
  };
}

function cliAgentAutoReviewVerdict(
  candidate: Record<string, unknown>,
  semanticConflict?: Record<string, unknown>,
): { decision: 'APPROVE' | 'SKIP'; reason: string } {
  if (semanticConflict) {
    return {
      decision: 'SKIP',
      reason: autoReviewReason(`semantic_duplicate_targets=${encodeReasonPayload(semanticConflict)}`),
    };
  }
  if (listIncludes(candidate.conflict_risks, 'same_evidence_rejected_before')) {
    return {
      decision: 'SKIP',
      reason: autoReviewReason('same_evidence_rejected_before'),
    };
  }
  if (array(candidate.source_evidence).length === 0 && candidate.recommendation_role !== 'source_dashboard') {
    return {
      decision: 'SKIP',
      reason: autoReviewReason('source_evidence_missing'),
    };
  }
  const heat = numberValue(candidate.heat_count90d);
  const users = numberValue(candidate.user_count90d);
  const impact = numberValue(candidate.impact_degree);
  const matched: string[] = [];
  if (heat >= AUTO_REVIEW_MIN_HEAT) matched.push(`heat_count90d>=${AUTO_REVIEW_MIN_HEAT}`);
  if (users >= AUTO_REVIEW_MIN_USERS) matched.push(`user_count90d>=${AUTO_REVIEW_MIN_USERS}`);
  if (impact > AUTO_REVIEW_MIN_IMPACT) matched.push(`impact_degree>${AUTO_REVIEW_MIN_IMPACT}.0`);
  if (matched.length === 0) {
    return {
      decision: 'SKIP',
      reason: autoReviewReason(`signals_below_threshold: heat_count90d=${heat}, user_count90d=${users}, impact_degree=${impact}`),
    };
  }
  return {
    decision: 'APPROVE',
    reason: autoReviewReason(`matched=${matched.join(',')}; role=${stringValue(candidate.recommendation_role) ?? 'asset'}`),
  };
}

function autoReviewReason(reason: string): string {
  return `source=AGENT_AUTO_REVIEW; rule_version=agent_auto_asset_certification_v1; ${reason}`;
}

function autoReviewItemsWithDisplayReason(items: unknown): Record<string, unknown>[] {
  return array(items).map((value) => {
    const item = record(value);
    const copy: Record<string, unknown> = {
      ...item,
      semantic_duplicate_targets: semanticDuplicateTargetsFromReason(stringValue(item.reason) ?? ''),
    };
    if (item.decision !== 'APPROVE') {
      copy.display_reason = autoReviewDisplayReason(item);
    }
    return copy;
  });
}

function semanticDuplicateConflicts(candidates: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();
  const comparable = candidates
    .map((candidate) => comparableAsset(candidate))
    .filter((candidate): candidate is ComparableAsset => !!candidate);
  for (const candidate of comparable) {
    if (candidate.actionable !== true || candidate.actionState !== 'PENDING') continue;
    const matches: Array<{ asset: ComparableAsset; basis: string }> = [];
    for (const other of comparable) {
      if (candidate.assetKey === other.assetKey) continue;
      const basis = semanticDuplicateBasis(candidate, other);
      if (basis) matches.push({ asset: other, basis });
    }
    if (!matches.length) continue;
    matches.sort((left, right) => duplicateRank(right.asset) - duplicateRank(left.asset));
    const targets = matches.slice(0, 3).map(({ asset, basis }) => ({
      target_ref: { type: asset.type, key: asset.key },
      display_name: asset.displayName,
      resource_type: asset.type,
      resource_key: asset.key,
      authentication_status: asset.authenticationStatus,
      action_state: asset.actionState,
      reason: duplicateBasisText(basis),
    }));
    result.set(candidate.assetKey, {
      targets,
      basis: Array.from(new Set(matches.map((match) => match.basis))).map(duplicateBasisText),
    });
  }
  return result;
}

type ComparableAsset = {
  assetKey: string;
  type: string;
  key: string;
  displayName: string;
  description: string;
  authenticationStatus: number;
  actionState: string;
  actionable: boolean;
  normalizedName: string;
  canonicalName: string;
  aliasName: string;
  normalizedDescription: string;
  heat: number;
  users: number;
  impact: number;
};

function comparableAsset(candidate: Record<string, unknown>): ComparableAsset | undefined {
  const target = record(candidate.target_ref);
  const type = stringValue(target.type);
  const key = stringValue(target.key);
  if (!type || !key) return undefined;
  const displayName = stringValue(candidate.display_name) ?? key;
  const evidence = record(candidate.evidence_snapshot);
  const evidenceAsset = record(evidence.asset);
  const description = stringValue(record(candidate.evidence_snapshot).description)
    ?? stringValue(evidenceAsset.description)
    ?? stringValue(candidate.description)
    ?? '';
  return {
    assetKey: `${type}|${key}`,
    type,
    key,
    displayName,
    description,
    authenticationStatus: numberValue(evidenceAsset.authentication_status ?? candidate.authentication_status),
    actionState: stringValue(candidate.action_state) ?? '',
    actionable: candidate.actionable === true,
    normalizedName: normalizeSemanticText(displayName || key),
    canonicalName: canonicalDuplicateText(displayName || key),
    aliasName: aliasDuplicateText(displayName || key),
    normalizedDescription: normalizeSemanticText(description),
    heat: numberValue(candidate.heat_count90d),
    users: numberValue(candidate.user_count90d),
    impact: numberValue(candidate.impact_degree),
  };
}

function semanticDuplicateBasis(left: ComparableAsset, right: ComparableAsset): string | undefined {
  if (!left.normalizedName || !right.normalizedName) return undefined;
  if (left.normalizedName.length >= 3 && left.normalizedName === right.normalizedName) return 'same_display_name';
  if (left.canonicalName.length >= 3 && left.canonicalName === right.canonicalName) return 'copy_or_suffix_variant';
  if (left.aliasName.length >= 3 && left.aliasName === right.aliasName && relatedAssetTypes(left.type, right.type)) {
    return 'business_alias_equivalent';
  }
  if (left.normalizedDescription.length >= 6 && left.normalizedDescription === right.normalizedDescription) {
    return 'same_description';
  }
  return undefined;
}

function relatedAssetTypes(left: string, right: string): boolean {
  if (left === right) return true;
  return left.endsWith('_prop') && right.endsWith('_prop');
}

function duplicateRank(asset: ComparableAsset): number {
  return (asset.authenticationStatus === 1 ? 100000 : 0)
    + (asset.actionState === 'AUTHENTICATED' ? 50000 : 0)
    + asset.heat + asset.users * 10 + asset.impact * 100;
}

function normalizeSemanticText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_\-—–/\\|:：,，.。"'`【】\[\]()（）{}<>《》]/g, '')
    .trim();
}

function canonicalDuplicateText(value: string): string {
  return normalizeSemanticText(value)
    .replace(/(副本|复制|拷贝|备份|copy|backup|bak|test|测试|临时|tmp)+$/g, '')
    .replace(/v\d+$/g, '')
    .replace(/\d+$/g, '');
}

function aliasDuplicateText(value: string): string {
  return canonicalDuplicateText(value)
    .replace(/(公司|企业|客户|客戶|client|customer|company|account)/g, '客户')
    .replace(/(项目|工程|project)/g, '项目')
    .replace(/(用户|玩家|会员|user|player|member)/g, '用户');
}

function duplicateBasisText(value: string): string {
  switch (value) {
    case 'same_display_name':
      return '资产名称一致';
    case 'copy_or_suffix_variant':
      return '名称仅存在副本、版本或临时后缀差异';
    case 'business_alias_equivalent':
      return '业务对象表述相近，可能是同义属性或相近口径';
    case 'same_description':
      return '资产描述一致';
    default:
      return value;
  }
}

function encodeReasonPayload(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeReasonPayload(value: string): Record<string, unknown> {
  try {
    return record(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    return {};
  }
}

function semanticDuplicateTargetsFromReason(reason: string): unknown[] {
  const encoded = /semantic_duplicate_targets=([A-Za-z0-9_-]+)/.exec(reason)?.[1];
  if (!encoded) return [];
  return array(decodeReasonPayload(encoded).targets);
}

function listIncludes(value: unknown, expected: string): boolean {
  return array(value).some((item) => item === expected);
}

function buildManualReviewHandoff(autoReviewResult: unknown, exportResult: unknown): Record<string, unknown> {
  const result = record(autoReviewResult);
  const exported = record(exportResult);
  const material = record(exported.review_material_package);
  const decisions = decisionsByAsset(result.items);
  const candidates = array(material.candidate_assets);
  const relations = array(material.relations).map(record);
  const handoffItems: Record<string, unknown>[] = [];
  const approved = new Set<string>();
  for (const decision of decisions.values()) {
    if (decision.decision === 'APPROVE' && decision.landing_status === 'APPLIED') {
      approved.add(decision.assetKey);
    }
  }
  const autoCertifiedItems = buildAutoCertifiedItems(decisions, candidates);
  for (const value of candidates) {
    const candidate = record(value);
    const target = record(candidate.target_ref);
    const type = stringValue(target.type);
    const key = stringValue(target.key);
    if (!type || !key) {
      continue;
    }
    const assetKey = `${type}|${key}`;
    if (approved.has(assetKey)) {
      continue;
    }
    const decision = decisions.get(assetKey);
    const actionable = candidate.actionable === true;
    if (!decision && !actionable) {
      continue;
    }
    const reviewReason = decision
      ? manualReviewReason(decision, candidate)
      : '本次自动认证未产生明确结论，可能是候选资产超出本次自动认证处理上限或被去重，请人工确认。';
    handoffItems.push({
      ...candidate,
      auto_review_decision: decision ? decision.raw : {
        decision: 'NOT_REVIEWED',
        reason: reviewReason,
      },
      semantic_duplicate_targets: decision ? array(decision.raw.semantic_duplicate_targets) : [],
      manual_review_reason: reviewReason,
    });
  }
  const pageReviewItems = buildPageReviewItems(handoffItems, candidates, relations, decisions);
  const pageReviewIds = new Set(pageReviewItems.map((item) => stringValue(item.client_item_id)).filter(Boolean));
  return {
    schema_version: '1.0',
    handoff_type: 'auto_review_uncertified_assets_to_page_review',
    project_id: result.project_id ?? exported.project_id,
    source_auto_review_run_id: result.run_id,
    source_export_run_id: exported.run_id,
    snapshot_hash: exported.snapshot_hash ?? result.snapshot_hash,
    dashboard_limit: exported.dashboard_limit ?? result.dashboard_limit,
    auto_review_trace: {
      run_id: result.run_id,
      rule_version: result.rule_version,
      auto_approved: result.auto_approved,
      skipped: result.skipped,
      overflow: result.overflow,
      approved_items: autoCertifiedItems,
      skipped_items: handoffItems.map((item) => ({
        target_ref: record(item.target_ref),
        display_name: item.display_name,
        manual_review_reason: item.manual_review_reason,
      })),
    },
    auto_certified_items: autoCertifiedItems,
    candidate_count: handoffItems.length,
    items: handoffItems,
    page_review_items: pageReviewItems,
    page_review_context_count: pageReviewItems.length - handoffItems.length,
    relations: relations.filter((edge) => pageReviewIds.has(stringValue(edge.parent)) && pageReviewIds.has(stringValue(edge.child))),
    source_index: array(material.source_index).map(record)
      .filter((source) => pageReviewIds.has(stringValue(source.client_item_id))),
    quality_gates: array(material.quality_gates),
    definition_policy: record(material.definition_policy),
    submit_to_page_policy: {
      command: 'analysis-meta agent-review submit-to-page',
      scope: 'Submit page_review_items so unapproved assets keep dashboard/report parent context; only items without manual_review_context require human certification decisions.',
      reason_field: 'manual_review_reason',
      source_metadata: 'When submitting leftovers, copy manual_review_handoff.auto_review_trace to submit-to-page source_metadata.auto_review_trace so the page audit records show the assets Agent already certified.',
      requires_user_submission_intent: true,
    },
  };
}

function buildPageReviewItems(
  handoffItems: Record<string, unknown>[],
  candidates: unknown[],
  relations: Record<string, unknown>[],
  decisions: Map<string, {
    assetKey: string;
    decision: string;
    landing_status: string;
    raw: Record<string, unknown>;
  }>,
): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  const requiredIds = new Set<string>();
  for (const value of candidates) {
    const candidate = record(value);
    const id = stringValue(candidate.client_item_id);
    if (id) byId.set(id, candidate);
  }
  for (const item of handoffItems) {
    const id = stringValue(item.client_item_id);
    if (id) requiredIds.add(id);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of relations) {
      const parent = stringValue(edge.parent);
      const child = stringValue(edge.child);
      if (parent && child && requiredIds.has(child) && !requiredIds.has(parent) && byId.has(parent)) {
        requiredIds.add(parent);
        changed = true;
      }
    }
  }
  const handoffById = new Map(handoffItems
    .map((item) => [stringValue(item.client_item_id), item] as const)
    .filter((entry): entry is [string, Record<string, unknown>] => !!entry[0]));
  return candidates
    .map(record)
    .filter((candidate) => {
      const id = stringValue(candidate.client_item_id);
      return id !== undefined && requiredIds.has(id);
    })
    .map((candidate) => {
      const id = stringValue(candidate.client_item_id) ?? '';
      const handoff = handoffById.get(id);
      if (handoff) return handoff;
      const target = record(candidate.target_ref);
      const type = stringValue(target.type);
      const key = stringValue(target.key);
      const decision = type && key ? decisions.get(`${type}|${key}`) : undefined;
      return markContextCandidate(candidate, decision);
    });
}

function markContextCandidate(
  candidate: Record<string, unknown>,
  decision?: {
    decision: string;
    landing_status: string;
    raw: Record<string, unknown>;
  },
): Record<string, unknown> {
  const item = { ...candidate };
  item.manual_review_context = true;
  item.manual_review_reason = '该资产用于保留自动发现页面的父子层级和来源上下文，不作为本次人工审核对象。';
  if (decision?.decision === 'APPROVE' && decision.landing_status === 'APPLIED') {
    item.auto_review_decision = decision.raw;
    item.auto_review_context_reason = autoReviewDisplayReason(decision.raw, candidate);
    item.evidence_snapshot = markEvidenceAuthenticated(record(candidate.evidence_snapshot));
  }
  return item;
}

function markEvidenceAuthenticated(evidence: Record<string, unknown>): Record<string, unknown> {
  const snapshot = { ...evidence };
  const asset = record(snapshot.asset);
  if (Object.keys(asset).length) {
    snapshot.asset = { ...asset, authentication_status: 1 };
  }
  return snapshot;
}

function decisionsByAsset(value: unknown): Map<string, {
  assetKey: string;
  decision: string;
  landing_status: string;
  raw: Record<string, unknown>;
}> {
  const result = new Map<string, {
    assetKey: string;
    decision: string;
    landing_status: string;
    raw: Record<string, unknown>;
  }>();
  for (const itemValue of array(value)) {
    const item = record(itemValue);
    if (item.item_type !== 'asset') {
      continue;
    }
    const type = stringValue(item.resource_type);
    const key = stringValue(item.resource_key);
    if (!type || !key) {
      continue;
    }
    const assetKey = `${type}|${key}`;
    result.set(assetKey, {
      assetKey,
      decision: stringValue(item.decision) ?? '',
      landing_status: stringValue(item.landing_status) ?? '',
      raw: item,
    });
  }
  return result;
}

function buildAutoCertifiedItems(
  decisions: Map<string, {
    assetKey: string;
    decision: string;
    landing_status: string;
    raw: Record<string, unknown>;
  }>,
  candidates: unknown[],
): Record<string, unknown>[] {
  const byAsset = new Map<string, Record<string, unknown>>();
  for (const value of candidates) {
    const candidate = record(value);
    const target = record(candidate.target_ref);
    const type = stringValue(target.type);
    const key = stringValue(target.key);
    if (type && key) byAsset.set(`${type}|${key}`, candidate);
  }
  const items: Record<string, unknown>[] = [];
  for (const decision of decisions.values()) {
    if (decision.decision !== 'APPROVE' || decision.landing_status !== 'APPLIED') continue;
    const candidate = byAsset.get(decision.assetKey) ?? {};
    items.push({
      target_ref: record(candidate.target_ref),
      display_name: candidate.display_name ?? decision.raw.resource_key,
      auto_review_reason: autoReviewDisplayReason(decision.raw, candidate),
      landing_message: decision.raw.landing_message,
    });
  }
  return items;
}

function manualReviewReason(
  decision: { decision: string; landing_status: string; raw: Record<string, unknown> },
  context: Record<string, unknown>,
): string {
  const reason = autoReviewDisplayReason(decision.raw, context);
  if (decision.decision === 'SKIP') {
    return reason;
  }
  if (decision.decision === 'APPROVE' && decision.landing_status !== 'APPLIED') {
    const landing = stringValue(decision.raw.landing_message);
    return landing ? `${reason}; landing_${decision.landing_status.toLowerCase()}: ${landing}` : `${reason}; landing_${decision.landing_status.toLowerCase()}`;
  }
  return reason;
}

function autoReviewDisplayReason(raw: Record<string, unknown>, context: Record<string, unknown> = {}): string {
  const display = stringValue(raw.display_reason);
  if (display) return display;
  const reason = stringValue(raw.reason);
  if (!reason) return '本次自动认证没有返回原因，请人工确认。';
  return humanizeAutoReviewReason(reason, context);
}

function humanizeAutoReviewReason(reason: string, context: Record<string, unknown>): string {
  if (reason.includes('semantic_duplicate_targets=')) {
    const targets = semanticDuplicateTargetsFromReason(reason)
      .map(record)
      .map((target) => {
        const ref = record(target.target_ref);
        const label = stringValue(target.display_name) ?? stringValue(target.resource_key) ?? stringValue(ref.key) ?? '未知资产';
        const type = stringValue(target.resource_type) ?? stringValue(ref.type) ?? 'asset';
        const key = stringValue(target.resource_key) ?? stringValue(ref.key) ?? '-';
        const targetReason = stringValue(target.reason);
        return `${label}（${type}:${key}${targetReason ? `，${targetReason}` : ''}）`;
      });
    const targetText = targets.length ? targets.join('；') : '相近资产';
    return `未自动认证原因：疑似与 ${targetText} 语义重复或口径相近。`
      + '请人工确认是否应作为独立资产认证；如果只是副本、同义属性或相近口径，请优先选择更标准的资产。';
  }
  if (reason.includes('previous_decision_exists_for_different_evidence')) {
    return '未自动认证原因：检测到该资产存在历史处理记录，但本次未返回可核验的重复对象。'
      + '请按当前资产定义和来源证据人工确认；这不代表系统发现了重复资产。';
  }
  if (reason.includes('same_evidence_rejected_before')) {
    return '未自动认证原因：相同认证建议此前已被人工驳回，自动认证不会覆盖人工结论。'
      + '如业务口径已调整，请人工重新确认是否认证。';
  }
  if (reason.includes('source_evidence_missing')) {
    return '自动认证未通过：缺少可核验的来源资产证据，请人工确认资产来源、定义和依赖关系后再认证。';
  }
  if (reason.includes('signals_below_threshold')) {
    const heat = /heat_count90d=(\d+)/.exec(reason)?.[1];
    const users = /user_count90d=(\d+)/.exec(reason)?.[1];
    const impact = /impact_degree=([0-9.]+)/.exec(reason)?.[1];
    return `自动认证未通过：该资产近 90 天访问/使用 ${heat ?? '未知'} 次、使用人数 ${users ?? '未知'}，影响度 ${impact ?? '未知'}，未达到自动认证阈值，请人工确认是否仍需要认证。`;
  }
  if (reason.includes('matched=')) {
    const matched: string[] = [];
    if (reason.includes('heat_count90d>=')) matched.push('访问/使用次数达到阈值');
    if (reason.includes('user_count90d>=')) matched.push('使用人数达到阈值');
    if (reason.includes('impact_degree>')) matched.push('影响度达到阈值');
    const matchedText = matched.length ? matched.join('、') : '命中自动认证规则';
    return `Agent 自动认证通过：该资产近 90 天访问/使用 ${displaySignal(context.heat_count90d)} 次、使用人数 ${displaySignal(context.user_count90d)}，影响度 ${displaySignal(context.impact_degree)}；未发现语义重复风险，且${matchedText}。`;
  }
  return reason
    .replace(/^source=AGENT_AUTO_REVIEW;\s*/, '')
    .replace(/rule_version=[^;]+;\s*/, '')
    .replace(/conflict_risks=\[[^\]]*]/, '自动认证未通过：存在需要人工确认的审核风险。')
    .replace(/conflict_risks=/, '自动认证未通过：存在需要人工确认的审核风险。');
}

function displaySignal(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  return '未知';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
