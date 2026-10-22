import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/datasets';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name') };
  const description = ctx.str('description');
  if (description) body.description = description;
  return body;
}

export const createDataset: Command = {
  service: 'evaluation',
  command: '+create_dataset',
  description:
    'Create a blank evaluation dataset via POST /agenteval/api/v1/datasets. Returns the created dataset.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Dataset name (1-128 characters)' },
    { name: 'description', type: 'string', desc: 'Optional dataset description (<=2000 characters)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
