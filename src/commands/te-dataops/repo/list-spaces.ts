import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'repo_list_spaces';

export const listSpaces: Command = {
  service: 'dataops_repo',
  command: '+list_spaces',
  description: 'List DataOps spaces accessible to the current user. Use this first when spaceCode is unknown. Returns createTime, spaceCode, and spaceDisplayName. No flags are required.',
  flags: [],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, {}),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, {});
  },
};
