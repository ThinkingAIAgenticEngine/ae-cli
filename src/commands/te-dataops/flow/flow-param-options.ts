import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';

export const flowParamScopeFlags: Flag[] = [
  { name: 'spaceCode', type: 'string', required: true, desc: 'Space code containing the workflow' },
  { name: 'flowCode', type: 'number', required: true, desc: 'Workflow code as a positive safe integer' },
];

export const flowParamKeyFlag: Flag = {
  name: 'paramKey', type: 'string', required: true,
  desc: 'Custom parameter name: 1-40 lowercase letters, digits, or underscores; start with a letter; ws_ prefix and env are reserved. On update, this is the new name',
};

export function buildFlowParamScope(ctx: RuntimeContext) {
  const spaceCode = ctx.str('spaceCode');
  if (!spaceCode.trim()) {
    throw new CliValidationError('--spaceCode is required');
  }
  const raw = ctx.str('flowCode').trim();
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new CliValidationError('--flowCode must be a positive safe integer');
  }
  return { spaceCode, flowCode: ctx.num('flowCode') };
}

export function validateFlowParamKey(value: string, field = 'paramKey'): string {
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(value) || value.startsWith('ws_') || value === 'env') {
    throw new CliValidationError(`--${field} must be 1-40 lowercase letters, digits, or underscores, start with a letter, and must not use the ws_ prefix or env`);
  }
  return value;
}

export function buildFlowParamWriteArgs(ctx: RuntimeContext) {
  const paramValue = ctx.list('paramValue')[0];
  const paramDataType = ctx.list('paramDataType')[0];
  const remark = ctx.list('remark')[0];
  if (paramValue === '') {
    throw new CliValidationError('--paramValue must be a non-empty string');
  }
  if (paramDataType !== undefined && paramDataType !== 'VARCHAR' && paramDataType !== 'EXPRESSION') {
    throw new CliValidationError('--paramDataType must be VARCHAR or EXPRESSION');
  }
  if (remark !== undefined && remark.length > 200) {
    throw new CliValidationError('--remark must not exceed 200 characters');
  }
  return { paramValue, paramDataType, remark };
}
