import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requireSpaceCode } from './python-task-options.js';

const toolName = 'flow_list_python_versions';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return { spaceCode: requireSpaceCode(ctx) };
}

export const listPythonVersions: Command = {
  service: 'dataops_flow',
  command: '+list_python_versions',
  description: 'List supported Python versions for workflow Python tasks in the space. Returns versions and defaultVersion (the first configured version, e.g. 3.11).',
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
