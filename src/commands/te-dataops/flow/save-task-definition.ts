import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const saveTaskDefinition: Command = {
  service: 'dataops_flow',
  command: '+save_task_definition',
  description: 'Save task definition, including SQL content, retry strategy, timeout configuration, etc. Write operation requires two-step confirmation. taskContentJson format varies by taskType: TRINO_SQL type: {"sql":"SELECT ...","repoCode":"xxx","catalog":"hive","schema":"db"}; SHELL type: {"script":"#!/bin/bash\\n..."}. Can get taskCode of existing tasks via flow_get_flow_dag. Related tools: flow_get_task_params (view available parameters)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task code' },
    { name: 'taskContentJson', type: 'string', required: false, desc: 'Task content JSON (includes SQL etc., format varies by taskType)' },
    { name: 'failRetryTimes', type: 'number', required: false, desc: 'Failure retry count, defaults to no retry if not provided' },
    { name: 'failRetryInterval', type: 'number', required: false, desc: 'Failure retry interval (seconds)' },
    { name: 'timeout', type: 'number', required: false, desc: 'Timeout duration (minutes)' },
    { name: 'owner', type: 'string', required: false, desc: 'Owner openId' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_save_task_definition', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      taskCode: ctx.num('taskCode'),
      taskContentJson: ctx.str('taskContentJson'),
      failRetryTimes: ctx.num('failRetryTimes'),
      failRetryInterval: ctx.num('failRetryInterval'),
      timeout: ctx.num('timeout'),
      owner: ctx.str('owner'),
      remark: ctx.str('remark'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};