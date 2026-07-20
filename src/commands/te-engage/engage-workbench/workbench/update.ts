import { createEngageWorkbenchCapabilityCommand } from '../../shared.js';

/** Updates a workbench metric slot owned by the current user. */
export const workbenchUpdate = createEngageWorkbenchCapabilityCommand({
  resource: 'workbench',
  command: 'update',
  capabilityId: 'engage-workbench.workbench.update',
  description: "Update a workbench metric slot's metric, date range or order (own slot only).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'slot-id', type: 'string', required: true, desc: 'Slot ID to update.' },
    { name: 'metric-type', type: 'number', required: true, desc: 'Metric type code (WorkbenchSlotMetricTypeEnum, 1-12).' },
    { name: 'date-type', type: 'number', required: true, desc: 'Date type code (WorkbenchSlotDateTypeEnum, 1-13).' },
    { name: 'order-id', type: 'number', required: false, desc: 'Display order (1-4).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    slot_id: ctx.str('slot-id'),
    metric_type: ctx.num('metric-type'),
    date_type: ctx.num('date-type'),
    order_id: ctx.optionalNum('order-id'),
  }),
});
