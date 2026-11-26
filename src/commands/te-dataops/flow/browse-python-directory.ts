import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { requireSpaceCode } from './python-task-options.js';

const toolName = 'flow_browse_python_directory';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  const spaceCode = requireSpaceCode(ctx);
  const rawPath = ctx.str('path');
  if (rawPath !== '' && !rawPath.trim()) {
    throw new CliValidationError('--path must not be whitespace only');
  }
  const maxDepth = ctx.optionalNum('maxDepth');
  if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 3)) {
    throw new CliValidationError('--maxDepth must be an integer between 1 and 3');
  }
  const maxEntries = ctx.optionalNum('maxEntries');
  if (maxEntries !== undefined && (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 500)) {
    throw new CliValidationError('--maxEntries must be an integer between 1 and 500');
  }
  return {
    spaceCode,
    path: rawPath || undefined,
    maxDepth,
    maxEntries,
  };
}

export const browsePythonDirectory: Command = {
  service: 'dataops_flow',
  command: '+browse_python_directory',
  description: 'Bounded browse of DEV Python workspace directories and files. Omit --path to skip virtual parent folders and expand directly from all authorized mount roots. Reflects DEV storage only, not PROD.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'path', type: 'string', required: false, desc: 'Optional absolute POSIX path to browse (e.g. /dw/<space>/product/subdir). Omit to expand from all authorized mount roots' },
    { name: 'maxDepth', type: 'number', required: false, default: 2, min: 1, max: 3, desc: 'Expansion depth (1-3). Default 2' },
    { name: 'maxEntries', type: 'number', required: false, default: 200, min: 1, max: 500, desc: 'Maximum entries returned (1-500). Default 200' },
  ],
  risk: 'read',
  validate: (ctx) => {
    buildArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
