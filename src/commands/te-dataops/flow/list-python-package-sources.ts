import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requireSpaceCode } from './python-task-options.js';

const toolName = 'flow_list_python_package_sources';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return { spaceCode: requireSpaceCode(ctx) };
}

export const listPythonPackageSources: Command = {
  service: 'dataops_flow',
  command: '+list_python_package_sources',
  description: 'List cluster-enabled pip package sources available for workflow Python tasks. Returns packageSources (sourceKey, name, url, defaultSource) and defaultSourceKey.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  validate: (ctx) => {
    buildArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
