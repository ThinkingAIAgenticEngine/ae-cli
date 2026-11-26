import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requirePositiveSafeInt, requireSpaceCode } from './python-task-options.js';

const toolName = 'flow_get_python_task';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: requireSpaceCode(ctx),
    flowCode: requirePositiveSafeInt(ctx, 'flowCode'),
    taskCode: requirePositiveSafeInt(ctx, 'taskCode'),
  };
}

export const getPythonTask: Command = {
  service: 'dataops_flow',
  command: '+get_python_task',
  description: 'Get the DEV definition of one Python task node (taskType=PYTHON). Requires spaceCode, flowCode, and taskCode. Returns pythonTask (scriptContent, pythonVersion, requirementsTxt, packageSourceId, runtimeMode), preTasks, retry policy, outputParams, taskParams, and paramSources. For historical PROD execution snapshots, use dataops_operations +get_task_instance_detail.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Python task node code' },
  ],
  risk: 'read',
  validate: (ctx) => {
    buildArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
