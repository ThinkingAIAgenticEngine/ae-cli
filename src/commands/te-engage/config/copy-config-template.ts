import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'copy_config_template';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    sourceProjectId: ctx.num('source-project-id'),
    sourceConfigId: ctx.str('source-config-id'),
    sourceTemplateId: ctx.str('source-template-id'),
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
  };
}

export const copyConfigTemplate: Command = {
  service: 'te-engage',
  command: '+copy-config-template',
  description: 'Copy one template from a source config item to a target config item.',
  flags: [
    { name: 'source-project-id', type: 'number', required: true, desc: 'Source project ID' },
    { name: 'source-config-id', type: 'string', required: true, desc: 'Source config item ID' },
    { name: 'source-template-id', type: 'string', required: true, desc: 'Source template ID' },
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Target project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Target config item ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
