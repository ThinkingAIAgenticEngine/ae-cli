import type { Command, RuntimeContext } from '../../../framework/types.js';
import { printError } from '../../../framework/output.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_create_view';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    ddl: ctx.str('ddl'),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateEnvPlaceholder(ctx: RuntimeContext): void {
  const spaceCode = ctx.str('spaceCode');
  const ddl = ctx.str('ddl');
  const schemaPattern = new RegExp(`\\bws_${escapeRegExp(spaceCode)}_(?:dev|product)?(?=\\.)`, 'i');
  const match = ddl.match(schemaPattern);
  if (!match) return;

  const message =
    `CREATE VIEW DDL references workspace task schema "${match[0]}". Use the literal \${env} placeholder to avoid cross-environment dependencies. ` +
    `For a concrete space code, wrap the DDL in single quotes, for example: --ddl 'CREATE VIEW ... FROM hive.ws_${spaceCode}_\${env}.table'. ` +
    `If you use double quotes with shell variables, escape only env as ws_${spaceCode}_\\\${env}.`;
  printError('validation', message);
  process.exit(1);
}

export const createView: Command = {
  service: 'dataops_datatable',
  command: '+create_view',
  description: 'Create a DataOps view in DEV from Trino-compatible CREATE VIEW DDL. Saves TASK_ENV metadata through the DataView save flow in the default workspace warehouse (repo=te_etl, catalog=hive) and does not publish PROD. Returns action/result/status; result contains success details or errors on failure. Publish by name with +publish_entity. Keep ${env} literal when referencing current-space task tables.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'ddl', type: 'string', required: true, desc: 'Complete Trino-compatible CREATE VIEW DDL statement; keep ${env} literal when referencing current-space task tables' },
  ],
  risk: 'write',
  validate: validateEnvPlaceholder,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
