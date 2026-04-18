import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const previewParamExpression: Command = {
  service: 'dataops_repo',
  command: '+preview_param_expression',
  description: 'Preview calculation result of parameter expression, returns actual value after expression parsing. Applicable for verifying parameter expression correctness. Expression format example: ${yyyyMMdd}',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'expression', type: 'string', required: true, desc: 'Parameter expression, e.g., ${yyyyMMdd}' },
    { name: 'baseDate', type: 'string', required: false, desc: 'Base date, format yyyy-MM-dd, defaults to current day if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_preview_param_expression', {
      spaceCode: ctx.str('spaceCode'),
      expression: ctx.str('expression'),
      baseDate: ctx.str('baseDate'),
    });
    return parseMcpResult(result);
  },
};