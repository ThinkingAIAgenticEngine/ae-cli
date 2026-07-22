import { createEngageFlowCapabilityCommand } from '../../shared.js';
import { readOptionalNumber, readOptionalString, requireAnyFlag } from '../../utils.js';

/** Modifies flow basic information. */
export const flowModifyBaseInfo = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'modify-base-info', capabilityId: 'engage-flow.flow.modify-base-info',
  description: 'Modify flow name, description, or group.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-uuid', type: 'string', required: true, desc: 'Flow UUID.' },
    { name: 'flow-name', type: 'string', required: false, desc: 'New flow name.' },
    { name: 'flow-desc', type: 'string', required: false, desc: 'New flow description.' },
    { name: 'group-id', type: 'number', required: false, desc: 'New group ID.' },
  ],
  risk: 'write',
  validate: (ctx) => requireAnyFlag(ctx, ['flow-name', 'flow-desc', 'group-id']),
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'), flow_uuid: ctx.str('flow-uuid'),
    ...(readOptionalString(ctx, 'flow-name') !== undefined && { flow_name: readOptionalString(ctx, 'flow-name') }),
    ...(readOptionalString(ctx, 'flow-desc') !== undefined && { flow_desc: readOptionalString(ctx, 'flow-desc') }),
    ...(readOptionalNumber(ctx, 'group-id') !== undefined && { group_id: readOptionalNumber(ctx, 'group-id') }),
  }),
});
