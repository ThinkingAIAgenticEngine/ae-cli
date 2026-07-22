import { createEngageFlowCapabilityCommand } from '../../shared.js';
import { readRequiredJsonArray } from '../../utils.js';

/** Deletes flow canvases. */
export const flowDelete = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'delete', capabilityId: 'engage-flow.flow.delete',
  description: 'Batch delete flow canvases.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-uuid-list', type: 'json', required: true, desc: 'Flow UUIDs as a JSON array.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { readRequiredJsonArray(ctx, 'flow-uuid-list'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), flow_uuid_list: readRequiredJsonArray(ctx, 'flow-uuid-list') }),
});
