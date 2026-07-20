import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Sets preset metric QP config (impression/click/attend) of a config item. */
export const presetMetricSet = createEngageSceneCapabilityCommand({
  resource: 'preset-metric',
  command: 'set',
  capabilityId: 'engage-scene.preset-metric.set',
  description: 'Set preset metric QP config (impression/click/attend) of a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'impression-event-qp', type: 'string', required: false, desc: 'Impression event QP JSON.' },
    { name: 'click-event-qp', type: 'string', required: false, desc: 'Click event QP JSON.' },
    { name: 'attend-event-qp', type: 'string', required: false, desc: 'Attend event QP JSON.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    impression_event_qp: ctx.str('impression-event-qp') || undefined,
    click_event_qp: ctx.str('click-event-qp') || undefined,
    attend_event_qp: ctx.str('attend-event-qp') || undefined,
  }),
});
