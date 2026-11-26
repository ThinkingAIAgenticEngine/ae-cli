import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requireSpaceCode } from './python-task-options.js';

const toolName = 'flow_list_python_directories';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return { spaceCode: requireSpaceCode(ctx) };
}

export const listPythonDirectories: Command = {
  service: 'dataops_flow',
  command: '+list_python_directories',
  description: 'List container mount root paths authorized for Python tasks in the space (own rw product/exchange and incoming cross-space ro exchange). Shared path contract across DEV and PROD without querying physical storage.',
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
