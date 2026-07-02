import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_list_repos';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
  };
}

export const listRepos: Command = {
  service: 'dataops_ide',
  command: '+ide_list_repos',
  description: 'List available IDE warehouse repositories for one space. Requires spaceCode. Returns an array grouped by connType: [{ connType, repos: [{ repoCode, repoDesc, engineTypes }] }].',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
