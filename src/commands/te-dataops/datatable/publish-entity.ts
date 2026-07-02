import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_publish_entity';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    entityType: ctx.str('entityType'),
    entityId: ctx.str('entityId'),
    name: ctx.str('name'),
  };
}

export const publishEntity: Command = {
  service: 'dataops_datatable',
  command: '+publish_entity',
  description: 'Publish one existing TASK_ENV DataOps table/view from DEV to PROD. Requires spaceCode and name. entityId disambiguates same-name matches; entityType (TABLE or VIEW) is an optional validation constraint. Returns action/result/status; result includes the resolved entity, published ids/names, onlineStatus=ONLINE, or errorType/candidates/errors on failure.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'name', type: 'string', required: true, desc: 'Existing table or view name to publish' },
    { name: 'entityId', type: 'string', required: false, desc: 'Optional DataOps entity ID for disambiguating same-name matches' },
    { name: 'entityType', type: 'string', required: false, desc: 'Optional validation constraint: TABLE or VIEW' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
