import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildCreatePythonTaskArgs, pythonScriptInputFlags } from './python-task-options.js';
import { createTaskWriteFlags } from './task-write-options.js';

const toolName = 'flow_create_python_task';

export const createPythonTask: Command = {
  service: 'dataops_flow',
  command: '+create_python_task',
  description: 'Create a DEV single-file Python task node (taskType=PYTHON) and save its definition. Requires spaceCode, flowCode, taskName, and either --scriptFile or --script. Combined script and requirements must not exceed 524288 UTF-8 bytes. Returns action/result/status; result includes pythonTaskSaved=true, flowCode, taskCode, taskName, taskType=PYTHON, pythonVersion, and packageSourceId.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    ...pythonScriptInputFlags,
    { name: 'remark', type: 'string', required: false, desc: 'Optional task remark, up to 200 characters' },
    ...createTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    buildCreatePythonTaskArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildCreatePythonTaskArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildCreatePythonTaskArgs(ctx)),
};
