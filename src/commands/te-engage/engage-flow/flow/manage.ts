import type { RuntimeContext } from '../../../../framework/types.js';
import { createEngageFlowCapabilityCommand } from '../../shared.js';
import { readOptionalJsonArray, readOptionalString, readRequiredJsonArray } from '../../utils.js';

/** Validates the payload required by a flow management action. */
function validateAction(ctx: RuntimeContext): void {
  const action = ctx.str('action');
  if (['approve', 'deny', 'cancel'].includes(action)) readRequiredJsonArray(ctx, 'flow-list');
  if (action === 'pause') readRequiredJsonArray(ctx, 'pause-flow-list');
  if (['recover', 'end'].includes(action)) readRequiredJsonArray(ctx, 'flow-id-list');
}

/** Batch manages flows. */
export const flowManage = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'manage', capabilityId: 'engage-flow.flow.manage',
  description: 'Batch approve, deny, cancel, pause, recover, or end flows.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'action', type: 'string', required: true, desc: 'approve, deny, cancel, pause, recover, or end.' },
    { name: 'flow-list', type: 'json', required: false, desc: 'Flow review items as a JSON array.' },
    { name: 'pause-flow-list', type: 'json', required: false, desc: 'Flow pause items as a JSON array.' },
    { name: 'flow-id-list', type: 'json', required: false, desc: 'Flow IDs as a JSON array.' },
    { name: 'reason', type: 'string', required: false, desc: 'Review reason.' },
  ],
  risk: 'write', validate: validateAction,
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'), action: ctx.str('action'),
    ...(readOptionalJsonArray(ctx, 'flow-list') !== undefined && { flow_list: readOptionalJsonArray(ctx, 'flow-list') }),
    ...(readOptionalJsonArray(ctx, 'pause-flow-list') !== undefined && { pause_flow_list: readOptionalJsonArray(ctx, 'pause-flow-list') }),
    ...(readOptionalJsonArray(ctx, 'flow-id-list') !== undefined && { flow_id_list: readOptionalJsonArray(ctx, 'flow-id-list') }),
    ...(readOptionalString(ctx, 'reason') !== undefined && { reason: readOptionalString(ctx, 'reason') }),
  }),
});
