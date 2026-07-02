import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_list_catalogs';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    connType: optionalString(ctx, 'connType'),
    repoCode: optionalString(ctx, 'repoCode'),
  };
}

export const listCatalogs: Command = {
  service: 'dataops_ide',
  command: '+ide_list_catalogs',
  description: 'List accessible IDE catalogs and schemas. Requires spaceCode; connType and repoCode are optional and default to SPACE and te_etl. Returns catalog, catalogBelongEnum, schemaNum, and schemas.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: false, desc: 'Optional connection type: SPACE, ETL, or APP. Default SPACE' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Optional repository code. Default te_etl' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
