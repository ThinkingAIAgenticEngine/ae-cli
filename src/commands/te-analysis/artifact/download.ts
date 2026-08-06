import { resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import {
  downloadAnalysisArtifact,
  validateLifecycleFlags,
  withInterruptSignal,
} from '../../../core/analysis-async-artifact.js';

function artifactPath(runId: string, artifactId: string): string {
  return `runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/download`;
}

export const artifactDownload: Command = {
  service: 'analysis',
  resource: 'artifact',
  command: 'download',
  description: 'Stream a completed analysis capability-gateway artifact to a local file by its bound run_id/artifact_id pair.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
    { name: 'artifact-id', type: 'string', required: true, desc: 'Artifact ID returned by the same export capability.' },
    { name: 'output', type: 'string', required: true, desc: 'Local output file path. Existing paths are refused unless --force is passed.' },
    { name: 'force', type: 'boolean', required: false, desc: 'Atomically replace an existing output file.' },
  ],
  risk: 'read',
  validate: validateLifecycleFlags,
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      artifactPath(ctx.str('run-id'), ctx.str('artifact-id')),
    ),
    output_path: resolve(ctx.str('output')),
    ...(ctx.bool('force') ? { force: true } : {}),
  }),
  execute: async (ctx) => {
    validateLifecycleFlags(ctx);
    const runId = ctx.str('run-id');
    return withInterruptSignal(
      (signal) => downloadAnalysisArtifact(
        ctx.host(),
        runId,
        ctx.str('artifact-id'),
        ctx.str('output'),
        { force: ctx.bool('force'), signal },
      ),
      runId,
    );
  },
};
