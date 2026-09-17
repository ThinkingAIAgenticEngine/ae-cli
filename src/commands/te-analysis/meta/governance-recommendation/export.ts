import type { Flag } from '../../../../framework/types.js';
import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalBoolean,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { normalizeResourceUrlFields, resolvePublicWebHost } from '../../../../core/resource-url.js';

const windowDaysFlag: Flag = {
  name: 'window-days',
  type: 'number',
  required: false,
  min: 1,
  max: 365,
  desc: 'Usage window in days. Default: 90.',
};

const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  min: 1,
  max: 100,
  desc: 'Maximum hot dashboard evidence packages selected before report and metadata expansion. Default: 20; this is not the business-topic count.',
};

const includeCompletedFlag: Flag = {
  name: 'include-completed',
  type: 'boolean',
  required: false,
  desc: 'Whether to include completed/authenticated context in the same business topic. Default: true; set false only for pending-only review.',
};

const GOVERNANCE_RECOMMENDATION_EXPORT_HELP = [
  'Customer/Agent material package contract:',
  '- Requires project_semantic_enable=on. A disabled project returns PROJECT_SEMANTIC_DISABLED before collecting export materials.',
  '- Use this command as the entry point before asset-certification recommendation display or review-page submission.',
  '- The command requires a numeric --project-id. If the user provides only a project name, resolve it on the same host with ae-cli project info list before calling export.',
  '- The response run_id, snapshot_hash, and review_material_package are the handoff package for the Agent.',
  '- review_material_package should carry candidate_assets, heat evidence, source_link/evidence_links, relations, report definitions, AI-model definitions, target_revision, and hashes needed for review drafting.',
  '- Dashboard candidates may include optional space_id/space_name. Preserve these fields into the review draft when present; not every dashboard belongs to a space, so never invent or require them.',
  '- The Agent turns that package into a submit-to-page draft with batch ai_summary, presentation_snapshot, per-item ai_summary/reasons, copied evidence_snapshot, copied source links, and relations.',
  '- work_units are deterministic evidence containers from Common. They are not final page groups; the Agent clusters selected assets into one or more business-domain topics.',
  '- For report and SQL items, use packaged evidence_snapshot.analysis first. Call analysis-meta agent-review evidence only for explicit definition/analysis gaps or draft validation.',
  '- For real page-review submission, start with --limit 20, filter out completed/rejected/deferred/in-flight items, and expand to --limit 50 then --limit 100 only when the remaining pending review assets or visible business domains are too few.',
  '- Expansion increases business-domain coverage; it must not submit every pending asset found. Keep a daily review capacity target such as 20-50 pending assets, hard cap around 80, and select about 3-6 visible domains.',
  '- When candidates exceed the cap, rank by impact, heat, user count, dependency breadth, and under-covered domains; keep only direct context needed for selected pending assets and report overflow for later batches.',
  '- Draft only business domains with pending review assets. Completed/authenticated assets are necessary context under those visible domains, not standalone work and not a reason to display a zero-pending domain.',
  '- Generate long Agent summaries only for visible business domains and pending review assets; hidden domains and pure authenticated context should keep copied evidence/links without new page-visible narrative.',
  '- Page submission uses analysis-meta agent-review submit-to-page. governance-recommendation submit is for explicit approval decisions and must not be used to create page drafts.',
].join('\n');

export const metadataGovernanceRecommendationExport = createAnalysisMetaCapabilityCommand({
  resource: 'governance-recommendation',
  command: 'export',
  capabilityId: 'metadata.governance_recommendation.export',
  description: 'Export the material package for CLI Agent asset-authentication and metric-recommendation review.',
  helpText: GOVERNANCE_RECOMMENDATION_EXPORT_HELP,
  flags: [projectIdFlag, windowDaysFlag, limitFlag, includeCompletedFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    window_days: optionalNumber(ctx, 'window-days'),
    limit: optionalNumber(ctx, 'limit'),
    include_completed: optionalBoolean(ctx, 'include-completed'),
  }),
  postProcess: (result, _input, ctx) => {
    normalizeResourceUrlFields(result, resolvePublicWebHost(ctx.host()), ctx.host());
    return result;
  },
});
