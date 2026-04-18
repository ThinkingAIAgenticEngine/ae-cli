import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'copy_config_template';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    sourceProjectId: ctx.num('source_project_id'),
    sourceConfigId: ctx.str('source_config_id'),
    sourceTemplateId: ctx.str('source_template_id'),
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
  };
}

export const copyConfigTemplate: Command = {
  service: 'engage',
  command: '+copy_config_template',
  description: 'Copy one template from a source config item to a target config item.',
  flags: [
    { name: 'source_project_id', type: 'number', required: true, desc: 'Source project ID' },
    { name: 'source_config_id', type: 'string', required: true, desc: 'Source config item ID' },
    { name: 'source_template_id', type: 'string', required: true, desc: 'Source template ID' },
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Target project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Target config item ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
