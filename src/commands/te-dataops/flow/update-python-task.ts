import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildUpdatePythonTaskArgs, pythonScriptInputFlags } from './python-task-options.js';
import { updateTaskWriteFlags } from './task-write-options.js';

const toolName = 'flow_update_python_task';

export const updatePythonTask: Command = {
  service: 'dataops_flow',
  command: '+update_python_task',
  description: 'Partially update an existing DEV Python task node (taskType=PYTHON). Requires spaceCode, flowCode, taskCode, and at least one update field. Omitted fields keep existing values; --requirements "" (or an empty --requirementsFile) clears dependencies; --remark "" clears remark; --outputParams and --preTasks use three-state semantics (omit keeps, [] clears, non-empty replaces).',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Python task node code to update' },
    ...pythonScriptInputFlags,
    { name: 'remark', type: 'string', required: false, desc: 'Optional task remark, up to 200 characters; omit to keep existing, or pass "" to clear' },
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    buildUpdatePythonTaskArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildUpdatePythonTaskArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildUpdatePythonTaskArgs(ctx)),
};
