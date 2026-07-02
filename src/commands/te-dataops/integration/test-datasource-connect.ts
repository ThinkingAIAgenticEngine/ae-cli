import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_test_datasource_connect';

export const testDatasourceConnect: Command = {
  service: 'dataops_integration',
  command: '+test_datasource_connect',
  description: 'Test a saved datasource connection by name. Returns datasourceName, connectStatus, connectFails, lastConnectTime, and nextAction. May take longer for slow external systems.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceName', type: 'string', required: true, desc: 'Existing datasource name, exact match within the space' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, {
    spaceCode: ctx.str('spaceCode'),
    datasourceName: ctx.str('datasourceName'),
  }),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, {
      spaceCode: ctx.str('spaceCode'),
      datasourceName: ctx.str('datasourceName'),
    });
  },
};
