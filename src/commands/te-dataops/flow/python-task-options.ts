import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';
import { buildTaskWriteArgs, validateTaskWriteArgs } from './task-write-options.js';
import {
  MAX_OUTPUT_PARAM_REMARK_LENGTH,
  type TaskOutputParamInput,
  createOutputParamsFlag,
  explicitString,
  requirePositiveSafeInt,
  requireSpaceCode,
  resolveTaskOutputParams,
} from './task-output-param-options.js';

export { requirePositiveSafeInt, requireSpaceCode };
export type PythonOutputParamInput = TaskOutputParamInput;

export const MAX_PYTHON_CONTENT_BYTES = 512 * 1024;

export const pythonScriptInputFlags: Flag[] = [
  { name: 'scriptFile', type: 'string', required: false, desc: 'Path to a single local UTF-8 .py file used as main.py (recommended; mutually exclusive with --script)' },
  { name: 'script', type: 'string', required: false, desc: 'Inline Python script content for main.py (mutually exclusive with --scriptFile)' },
  { name: 'requirementsFile', type: 'string', required: false, desc: 'Path to a local UTF-8 requirements.txt file (recommended; mutually exclusive with --requirements)' },
  { name: 'requirements', type: 'string', required: false, desc: 'Inline pip requirements.txt text (mutually exclusive with --requirementsFile; pass "" on update to clear)' },
  { name: 'pythonVersion', type: 'string', required: false, desc: 'Python version from +list_python_versions. Omit on create to use the platform default (3.11); omit on update to keep existing' },
  { name: 'packageSourceId', type: 'string', required: false, desc: 'Enabled pip package source key from +list_python_package_sources. Omit on create to use the cluster default source; omit on update to keep existing' },
  createOutputParamsFlag('JSON array of OUT parameter declarations [{"paramKey":"out_dt","remark":"optional"}]. Omit on update to keep existing; pass [] to clear'),
];

function readRegularUtf8File(rawPath: string, flagName: string): string {
  if (!rawPath.trim()) {
    throw new CliValidationError(`--${flagName} must point to a regular file`);
  }
  const resolved = resolve(rawPath);
  if (!existsSync(resolved)) {
    throw new CliValidationError(`--${flagName} file not found: ${rawPath}`);
  }
  let stat;
  try {
    stat = statSync(resolved);
  } catch (err) {
    throw new CliValidationError(
      `Unable to inspect --${flagName} "${rawPath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!stat.isFile()) {
    throw new CliValidationError(`--${flagName} must point to a single regular file, not a directory: ${rawPath}`);
  }
  if (stat.size > MAX_PYTHON_CONTENT_BYTES) {
    throw new CliValidationError(
      `--${flagName} exceeds the ${MAX_PYTHON_CONTENT_BYTES}-byte limit (got ${stat.size} bytes)`,
    );
  }
  return readFileSync(resolved, 'utf8');
}

function resolveScriptContent(ctx: RuntimeContext, required: boolean): string | undefined {
  const inlineScript = explicitString(ctx, 'script');
  const scriptFile = explicitString(ctx, 'scriptFile');
  if (inlineScript !== undefined && scriptFile !== undefined) {
    throw new CliValidationError('Pass either --scriptFile or --script, not both');
  }
  if (scriptFile !== undefined) {
    const content = readRegularUtf8File(scriptFile, 'scriptFile');
    if (!content.trim()) {
      throw new CliValidationError('Python script content in --scriptFile must not be empty');
    }
    return content;
  }
  if (inlineScript !== undefined) {
    if (!inlineScript.trim()) {
      throw new CliValidationError('--script must not be empty');
    }
    return inlineScript;
  }
  if (required) {
    throw new CliValidationError('Pass --scriptFile or --script');
  }
  return undefined;
}

function resolveRequirementsContent(ctx: RuntimeContext): string | undefined {
  const inlineReq = explicitString(ctx, 'requirements');
  const reqFile = explicitString(ctx, 'requirementsFile');
  if (inlineReq !== undefined && reqFile !== undefined) {
    throw new CliValidationError('Pass either --requirementsFile or --requirements, not both');
  }
  if (reqFile !== undefined) {
    return readRegularUtf8File(reqFile, 'requirementsFile');
  }
  return inlineReq;
}

function resolveOptionalNonBlank(ctx: RuntimeContext, name: string): string | undefined {
  const val = explicitString(ctx, name);
  if (val !== undefined && !val.trim()) {
    throw new CliValidationError(`--${name} must not be empty`);
  }
  return val;
}

function resolveRemark(ctx: RuntimeContext, allowEmptyClear: boolean): string | undefined {
  const val = explicitString(ctx, 'remark');
  if (val === undefined) {
    return undefined;
  }
  if (val.length > MAX_OUTPUT_PARAM_REMARK_LENGTH) {
    throw new CliValidationError(`--remark must not exceed ${MAX_OUTPUT_PARAM_REMARK_LENGTH} characters`);
  }
  if (!allowEmptyClear && val === '') {
    return undefined;
  }
  return val;
}

function validateCombinedSize(scriptContent?: string, requirementsTxt?: string): void {
  const totalBytes = Buffer.byteLength(scriptContent ?? '', 'utf8')
    + Buffer.byteLength(requirementsTxt ?? '', 'utf8');
  if (totalBytes > MAX_PYTHON_CONTENT_BYTES) {
    throw new CliValidationError(
      `Combined scriptContent and requirementsTxt size (${totalBytes} UTF-8 bytes) exceeds the ${MAX_PYTHON_CONTENT_BYTES}-byte limit`,
    );
  }
}

export function buildCreatePythonTaskArgs(ctx: RuntimeContext): Record<string, unknown> {
  const spaceCode = requireSpaceCode(ctx);
  const flowCode = requirePositiveSafeInt(ctx, 'flowCode');
  const taskName = ctx.str('taskName');
  if (!taskName.trim()) {
    throw new CliValidationError('--taskName must be a non-empty string');
  }
  validateTaskWriteArgs(ctx);
  const scriptContent = resolveScriptContent(ctx, true);
  const requirementsTxt = resolveRequirementsContent(ctx);
  validateCombinedSize(scriptContent, requirementsTxt);
  const pythonVersion = resolveOptionalNonBlank(ctx, 'pythonVersion');
  const packageSourceId = resolveOptionalNonBlank(ctx, 'packageSourceId');
  const outputParams = resolveTaskOutputParams(ctx);
  const remark = resolveRemark(ctx, false);

  return {
    spaceCode,
    flowCode,
    taskName,
    scriptContent,
    requirementsTxt,
    pythonVersion,
    packageSourceId,
    outputParams,
    remark,
    ...buildTaskWriteArgs(ctx),
  };
}

export function buildUpdatePythonTaskArgs(ctx: RuntimeContext): Record<string, unknown> {
  const spaceCode = requireSpaceCode(ctx);
  const flowCode = requirePositiveSafeInt(ctx, 'flowCode');
  const taskCode = requirePositiveSafeInt(ctx, 'taskCode');
  validateTaskWriteArgs(ctx);
  const scriptContent = resolveScriptContent(ctx, false);
  const requirementsTxt = resolveRequirementsContent(ctx);
  validateCombinedSize(scriptContent, requirementsTxt);
  const pythonVersion = resolveOptionalNonBlank(ctx, 'pythonVersion');
  const packageSourceId = resolveOptionalNonBlank(ctx, 'packageSourceId');
  const outputParams = resolveTaskOutputParams(ctx);
  const remark = resolveRemark(ctx, true);
  const taskWriteArgs = buildTaskWriteArgs(ctx);

  const mutableValues = [
    scriptContent,
    requirementsTxt,
    pythonVersion,
    packageSourceId,
    outputParams,
    remark,
    ...Object.values(taskWriteArgs),
  ];
  if (mutableValues.every((value) => value === undefined)) {
    throw new CliValidationError(
      'Pass at least one update field (--scriptFile, --script, --requirementsFile, --requirements, --pythonVersion, --packageSourceId, --outputParams, --remark, --preTasks, or retry flags)',
    );
  }

  return {
    spaceCode,
    flowCode,
    taskCode,
    scriptContent,
    requirementsTxt,
    pythonVersion,
    packageSourceId,
    outputParams,
    remark,
    ...taskWriteArgs,
  };
}
