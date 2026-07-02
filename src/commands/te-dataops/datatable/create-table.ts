import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_create_table';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    ddl: ctx.str('ddl'),
  };
}

export const createTable: Command = {
  service: 'dataops_datatable',
  command: '+create_table',
  description: 'Create a DataOps physical table in DEV from Trino-compatible CREATE TABLE DDL. Saves TASK_ENV metadata in the default workspace warehouse (repo=te_etl, catalog=hive) and does not publish PROD. Returns action/result/status; result contains success details or parse/errors on failure. Publish by name with +publish_entity.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'ddl', type: 'string', required: true, desc: 'Complete Trino-compatible CREATE TABLE DDL statement' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
