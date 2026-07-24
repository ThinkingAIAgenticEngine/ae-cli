import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries the mix-cluster QP skill definition used by task/flow save guides. */
export const queryClusterQpSkill = createEngageSettingCapabilityCommand({
  resource: 'query',
  command: 'cluster-qp-skill',
  capabilityId: 'engage-setting.query.cluster-qp-skill',
  description:
    'Query the mix-cluster QP skill definition for audience, trigger, and completion event objects. '
    + 'Returns skill text (not final QP JSON). Use it before save when build-save-guide requires '
    + 'targetConfig.qp, triggerConfig.triggerRule, clientConfig.clientQp, or completionIndicatorDef.event.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'response-mode',
      type: 'string',
      required: false,
      desc: 'Skill content mode: base, examples, or full. Default: full.',
    },
    {
      name: 'condition-subtype',
      type: 'string',
      required: false,
      desc: 'Condition subtype selector: core, behavior_seq, or all. Default: all.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => {
    const input: Record<string, string | number> = {
      project_id: ctx.num('project-id'),
    };
    const responseMode = ctx.str('response-mode');
    const conditionSubtype = ctx.str('condition-subtype');
    if (responseMode) {
      input.response_mode = responseMode;
    }
    if (conditionSubtype) {
      input.condition_subtype = conditionSubtype;
    }
    return input;
  },
});
