import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-tasks';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'task-id')}/versions`;
}

export const listEvaluationTaskVersions: Command = {
  service: 'evaluation',
  command: '+list_evaluation_task_versions',
  description:
    'List published versions of an evaluation task via GET /agenteval/api/v1/evaluation-tasks/{taskId}/versions. Each version pins a dataset version; runs pin one immutable version.',
  flags: [
    ...evalFlags(),
    { name: 'task-id', type: 'string', required: true, desc: 'Evaluation task UUID' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
