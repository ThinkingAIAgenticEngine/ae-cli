import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Sets semantic preset metric events of a config item. */
export const presetMetricSet = createEngageSceneCapabilityCommand({
  resource: 'preset-metric',
  command: 'set',
  capabilityId: 'engage-scene.preset-metric.set',
  description: 'Set semantic impression/click/attend event definitions of a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'impression-event-definition', type: 'json', required: false, desc: 'Semantic impression event definition.' },
    { name: 'click-event-definition', type: 'json', required: false, desc: 'Semantic click event definition.' },
    { name: 'attend-event-definition', type: 'json', required: false, desc: 'Semantic attend event definition.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    impression_event_definition: ctx.json('impression-event-definition') || undefined,
    click_event_definition: ctx.json('click-event-definition') || undefined,
    attend_event_definition: ctx.json('attend-event-definition') || undefined,
  }),
});
