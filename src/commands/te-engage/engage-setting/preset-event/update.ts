import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Updates the project's preset metric event config (add/active/recharge event definitions). */
export const presetEventUpdate = createEngageSettingCapabilityCommand({
  resource: 'preset-event',
  command: 'update',
  capabilityId: 'engage-setting.preset-event.update',
  description: "Update the project's preset metric event config (add/active/recharge event definitions).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'add-event-desc', type: 'string', required: false, desc: 'Add-event qp definition.' },
    { name: 'active-event-desc', type: 'string', required: false, desc: 'Active-event qp definition.' },
    { name: 'recharge-event-desc', type: 'string', required: false, desc: 'Recharge-success-event qp definition.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    add_event_desc: ctx.str('add-event-desc') || undefined,
    active_event_desc: ctx.str('active-event-desc') || undefined,
    recharge_event_desc: ctx.str('recharge-event-desc') || undefined,
  }),
});
