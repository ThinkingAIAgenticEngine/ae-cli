import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_get_table_detail';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    tableName: ctx.str('tableName'),
    manageMode: ctx.str('manageMode'),
    env: ctx.str('env'),
    entityType: optionalString(ctx, 'entityType'),
  };
}

export const getTableDetail: Command = {
  service: 'dataops_datatable',
  command: '+get_table_detail',
  description: 'Get compact DataOps catalog detail for a table/view. Resolves tableName across task, IDE, system, and authorized-space tables unless manageMode is set. TASK_ENV without env returns environments.DEV/PRODUCT; otherwise returns detail. Detail contains identity/status/owner/columns plus optional description/partitionColumns/ddl/lineages. Ambiguous matches return candidates. Unlike ide_get_table_detail, this includes DataOps lifecycle/status/lineage when available.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'tableName', type: 'string', required: true, desc: 'Table name keyword; exact name recommended' },
    { name: 'manageMode', type: 'string', required: false, desc: 'Optional mode filter: TASK_ENV, IDE, SYSTEM, or AUTHED_SPACE. Omit to auto-match across modes' },
    { name: 'env', type: 'string', required: false, desc: 'Optional environment: DEV or PRODUCT. If omitted, TASK_ENV returns both environments' },
    { name: 'entityType', type: 'string', required: false, desc: 'Optional type hint: TABLE or VIEW. Omit unless the table name is ambiguous' },
  ],
  validate: (ctx) => {
    const entityType = optionalString(ctx, 'entityType');
    if (entityType !== undefined && entityType.toUpperCase() !== 'TABLE' && entityType.toUpperCase() !== 'VIEW') {
      throw new Error('entityType must be TABLE or VIEW');
    }
  },
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
