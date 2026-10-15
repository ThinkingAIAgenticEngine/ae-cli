import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildWorkspaceCliUrl, postWorkspaceApi, WORKSPACE_CLI_BASE_PATH } from './client.js';
import { optional, WORKSPACE_SERVICE } from './shared.js';

function createBody(ctx: RuntimeContext) {
  return {
    name: ctx.str('name'),
    description: optional(ctx, 'description'),
    type: 'personal',
    operationSource: 'ae_cli',
  };
}

export const createWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'create',
  description: 'Create a personal AgentSpace',
  flags: [
    { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 100, desc: 'AgentSpace name' },
    { name: 'description', type: 'string', required: false, maxLength: 500, desc: 'Optional AgentSpace description' },
    { name: 'type', type: 'string', required: false, default: 'personal', desc: 'Only personal is supported by this command' },
  ],
  risk: 'write',
  validate: (ctx) => {
    if (ctx.str('type') !== 'personal') {
      throw new CliValidationError('Only personal AgentSpaces can be created with ae-cli workspace create');
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildWorkspaceCliUrl(ctx, `${WORKSPACE_CLI_BASE_PATH}/agent-spaces`),
    body: createBody(ctx),
  }),
  execute: (ctx) => postWorkspaceApi(ctx, `${WORKSPACE_CLI_BASE_PATH}/agent-spaces`, createBody(ctx)),
};
