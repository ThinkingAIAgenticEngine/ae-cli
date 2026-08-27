import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';
import { readWhitelist } from './shared.js';

function buildInput(ctx: RuntimeContext): Record<string, unknown> {
  const ruleId = ctx.str('rule-id').trim();
  const status = ctx.str('status').trim() || 'draft';
  if (!['draft', 'enable', 'disable'].includes(status)) {
    throw new Error('Flag --status must be one of draft, enable, disable');
  }
  const input: Record<string, unknown> = {
    project_id: ctx.num('project-id'),
    feature_key: ctx.str('feature-key'),
    whitelist: readWhitelist(ctx),
    status,
  };
  if (ruleId) input.rule_id = ruleId;
  const priority = ctx.str('priority');
  if (priority !== '') input.priority = ctx.num('priority');
  return input;
}

/** Creates or modifies an explicit Feature whitelist rule. */
export const featureWhitelistSave = createExperimentCapabilityCommand({
  resource: 'feature whitelist', command: 'save',
  capabilityId: 'experiment.feature_whitelist.save',
  description: 'Create or modify a Feature whitelist rule and optionally enable it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Existing Feature key.' },
    { name: 'rule-id', type: 'string', desc: 'Existing whitelist rule ID; omit to create a new rule.' },
    { name: 'priority', type: 'number', desc: 'Rule priority; omitted create requests use the server-assigned next priority.' },
    { name: 'status', type: 'string', default: 'draft', desc: 'Rule status: draft, enable, or disable.' },
    {
      name: 'whitelist',
      type: 'json',
      required: true,
      desc: 'Whitelist bucket array: [{"bucket_id":"#user_id","rules":[{"ids":["u1"],"value":"on"}]}].',
    },
  ],
  risk: 'write',
  validate: (ctx) => { buildInput(ctx); },
  buildInput,
});
