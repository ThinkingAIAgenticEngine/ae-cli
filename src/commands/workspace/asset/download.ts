import { CliValidationError } from '../../../core/errors.js';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { getAgentBuffer } from '../../te-agent/api-client.js';
import { queryPath, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { resolveWorkspaceTarget, workspaceResourcePath, workspaceTargetFlags } from '../target.js';

export const downloadWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'download',
  description: 'Download an AgentSpace file without changing its bytes',
  flags: [
    ...workspaceTargetFlags,
    { name: 'path', type: 'string', required: true, desc: 'Relative file path' },
    { name: 'output', type: 'string', required: true, desc: 'Local output file path' },
    { name: 'overwrite', type: 'boolean', required: false, desc: 'Allow replacing an existing local file' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const output = resolve(ctx.str('output'));
    if (existsSync(output) && !ctx.bool('overwrite')) {
      throw new CliValidationError('The output file already exists. Use --overwrite true to replace it.');
    }
  },
  dryRun: (ctx) => targetDryRun(ctx, 'GET', queryPath('/documents/download', { path: ctx.str('path') }), {
    output: resolve(ctx.str('output')),
    overwrite: ctx.bool('overwrite'),
  }),
  execute: async (ctx) => {
    const target = await resolveWorkspaceTarget(ctx);
    const path = queryPath(workspaceResourcePath(target.agentSpaceId, '/documents/download'), { path: ctx.str('path') });
    const { buffer, fileName, contentType } = await getAgentBuffer(ctx, path);
    const output = resolve(ctx.str('output'));
    writeFileSync(output, buffer, { flag: ctx.bool('overwrite') ? 'w' : 'wx' });
    return { saved: true, path: output, size: buffer.length, file_name: fileName, content_type: contentType };
  },
};
