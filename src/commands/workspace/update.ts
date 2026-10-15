import type { Command, RuntimeContext } from '../../framework/types.js';
import { optional, targetCall, targetDryRun, WORKSPACE_SERVICE } from './shared.js';
import { workspaceTargetFlags } from './target.js';

function updateBody(ctx: RuntimeContext) {
  const description = optional(ctx, 'description');
  return {
    name: ctx.str('name'),
    ...(description === undefined ? {} : { description }),
    operationSource: 'ae_cli',
  };
}

export const updateWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'update',
  description: 'Update an AgentSpace profile',
  flags: [
    ...workspaceTargetFlags,
    { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 100, desc: 'New AgentSpace name' },
    { name: 'description', type: 'string', required: false, maxLength: 500, desc: 'New AgentSpace description; omitted values remain unchanged' },
  ],
  risk: 'write',
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', '', updateBody(ctx)),
  execute: (ctx) => targetCall(ctx, 'PATCH', '', updateBody(ctx)),
};
