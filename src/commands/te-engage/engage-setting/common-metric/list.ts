import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Lists all common (preset) metrics defined for a project. */
export const commonMetricList = createEngageSettingCapabilityCommand({
  resource: 'common-metric',
  command: 'list',
  capabilityId: 'engage-setting.common-metric.list',
  description: 'List all common (preset) metrics defined for a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
