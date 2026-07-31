import { createEngageSettingCapabilityCommand } from '../../shared.js';
import { validateSemanticEventDefinition } from '../../semantic-qp-validation.js';

/** Updates the project's preset metric event config (add/active/recharge event definitions). */
export const presetEventUpdate = createEngageSettingCapabilityCommand({
  resource: 'preset-event',
  command: 'update',
  capabilityId: 'engage-setting.preset-event.update',
  description: "Update the project's preset metric event config (add/active/recharge event definitions).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'add-event-definition', type: 'json', required: false, desc: 'Semantic add-event definition.' },
    { name: 'active-event-definition', type: 'json', required: false, desc: 'Semantic active-event definition.' },
    { name: 'recharge-event-definition', type: 'json', required: false, desc: 'Semantic recharge event definition.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    for (const name of ['add-event-definition', 'active-event-definition', 'recharge-event-definition']) {
      const definition = ctx.json(name);
      if (definition !== undefined) validateSemanticEventDefinition(definition, `--${name}`);
    }
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    add_event_definition: ctx.json('add-event-definition') || undefined,
    active_event_definition: ctx.json('active-event-definition') || undefined,
    recharge_event_definition: ctx.json('recharge-event-definition') || undefined,
  }),
});
