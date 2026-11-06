import type { RuntimeContext } from '../../../framework/types.js';
import { createExperimentCapabilityCommand } from '../capability-shared.js';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const status = ctx.str('status');
  if (!['enable', 'disable'].includes(status)) {
    throw new Error('Flag --status must be one of enable, disable');
  }
  return { project_id: ctx.num('project-id'), rule_id: ctx.str('rule-id'), status };
}

/** Enables or disables a Feature whitelist rule. */
export const featureWhitelistUpdateStatus = createExperimentCapabilityCommand({
  resource: 'feature whitelist', command: 'update-status',
  capabilityId: 'experiment.feature_whitelist.update_status',
  description: 'Enable or disable a Feature whitelist rule; enabled rules sync an online Feature to RCC.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'rule-id', type: 'string', required: true, desc: 'Whitelist rule ID.' },
    { name: 'status', type: 'string', required: true, desc: 'Target status: enable or disable.' },
  ],
  risk: 'write',
  validate: (ctx) => { buildBody(ctx); },
  buildInput: buildBody,
});
