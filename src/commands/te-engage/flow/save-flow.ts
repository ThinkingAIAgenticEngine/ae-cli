import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'save_flow';
const allowedOperations = ['build', 'preview', 'commit'];

function readAndValidateReq(ctx: RuntimeContext): Record<string, any> {
  const req = readRequiredJsonObject(ctx, 'req');
  const operation = typeof req.operation === 'string' ? req.operation.trim().toLowerCase() : '';
  if (!allowedOperations.includes(operation)) {
    throw new Error(`Flag --req.operation must be one of: ${allowedOperations.join(', ')}`);
  }
  if ('nodeList' in req || 'edgeList' in req) {
    throw new Error('Flag --req must use nodes/edges instead of legacy nodeList/edgeList');
  }
  if ('sourceFlowUuid' in req) {
    throw new Error('Flag --req.sourceFlowUuid is no longer supported; call +flow_detail and build nodes/edges instead');
  }
  return req;
}

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    req: {
      projectId: ctx.num('project_id'),
      ...readAndValidateReq(ctx),
    },
  };
}

export const saveFlow: Command = {
  service: 'engage',
  command: '+save_flow',
  description: 'Create, preview, or commit an operation-based flow draft with req.operation=build, preview, or commit. Copy existing flows by querying detail first, then building nodes/edges.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Operation-based flow save request JSON object. Use operation=build with nodes/edges, operation=preview with draftId, or operation=commit with draftVersion and confirmToken. Do not use sourceFlowUuid clone mode.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readAndValidateReq(ctx);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
