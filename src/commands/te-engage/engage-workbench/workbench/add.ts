import { createEngageWorkbenchCapabilityCommand } from '../../shared.js';

/** Adds a workbench metric slot for the current user (max 4 per project). */
export const workbenchAdd = createEngageWorkbenchCapabilityCommand({
  resource: 'workbench',
  command: 'add',
  capabilityId: 'engage-workbench.workbench.add',
  description: 'Add a workbench metric slot (metric + date range + order) for the current user.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-type', type: 'number', required: true, desc: 'Metric type code (WorkbenchSlotMetricTypeEnum, 1-12).' },
    { name: 'date-type', type: 'number', required: true, desc: 'Date type code (WorkbenchSlotDateTypeEnum, 1-13).' },
    { name: 'order-id', type: 'number', required: false, desc: 'Display order (1-4).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    metric_type: ctx.num('metric-type'),
    date_type: ctx.num('date-type'),
    order_id: ctx.optionalNum('order-id'),
  }),
});
