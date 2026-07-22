import type { RuntimeContext } from '../../../../framework/types.js';
import { createEngageFlowCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';

const allowedOperations = ['build', 'preview', 'commit'];

/** Reads and validates the operation-based flow request. */
function readRequest(ctx: RuntimeContext): Record<string, unknown> {
  const req = readRequiredJsonObject(ctx, 'req');
  const operation = typeof req.operation === 'string' ? req.operation.trim().toLowerCase() : '';
  if (!allowedOperations.includes(operation)) {
    throw new Error(`Flag --req.operation must be one of: ${allowedOperations.join(', ')}`);
  }
  if ('nodeList' in req || 'edgeList' in req) {
    throw new Error('Flag --req must use nodes/edges instead of legacy nodeList/edgeList');
  }
  if ('sourceFlowUuid' in req) {
    throw new Error('Flag --req.sourceFlowUuid is unsupported; get the source flow and build nodes/edges instead');
  }
  return req;
}

/** Builds, previews, or commits a flow draft. */
export const flowSave = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'save', capabilityId: 'engage-flow.flow.save',
  description: 'Build, preview, or commit an operation-based flow draft.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Operation-based flow save request JSON object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequest(ctx); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequest(ctx) }),
});
