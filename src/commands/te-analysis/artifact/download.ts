import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, downloadCapabilityArtifact } from '../../../core/capability-api.js';

export const artifactDownload: Command = {
  service: 'analysis',
  resource: 'artifact',
  command: 'download',
  description: 'Download a run-scoped analysis capability-gateway artifact to a local file.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
    { name: 'artifact-id', type: 'string', required: true, desc: 'Artifact ID returned by an export capability.' },
    { name: 'output', type: 'string', required: true, desc: 'Local output file path. Use a file path, not a directory.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      'analysis',
      `runs/${encodeURIComponent(ctx.str('run-id'))}/artifacts/${encodeURIComponent(ctx.str('artifact-id'))}/download`,
    ),
    body: {
      output_path: resolve(ctx.str('output')),
    },
  }),
  execute: async (ctx) => {
    const outputPath = resolve(ctx.str('output'));
    const artifact = await downloadCapabilityArtifact(
      ctx.host(),
      'analysis',
      ctx.str('run-id'),
      ctx.str('artifact-id'),
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, artifact.bytes);
    return {
      run_id: ctx.str('run-id'),
      artifact_id: ctx.str('artifact-id'),
      output_path: outputPath,
      bytes: artifact.bytes.byteLength,
      content_type: artifact.contentType,
      content_disposition: artifact.contentDisposition,
    };
  },
};
