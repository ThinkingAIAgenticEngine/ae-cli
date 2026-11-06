import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { readRuleIds } from './shared.js';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { project_id: ctx.num('project-id'), rule_ids: readRuleIds(ctx) };
}

/** Deletes Feature whitelist rules. */
export const featureWhitelistBatchDelete = createExperimentCapabilityCommand({
  resource: 'feature whitelist', command: 'batch-delete',
  capabilityId: 'experiment.feature_whitelist.batch_delete',
  description: 'Delete Feature whitelist rules; enabled whitelist rules are allowed and trigger RCC resync.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'rule-ids', type: 'json', required: true, desc: 'Non-empty JSON array of whitelist rule IDs.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { buildBody(ctx); },
  buildInput: buildBody,
});
