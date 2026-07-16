import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import {
  buildCapabilityGatewayUrl,
  CapabilityGatewayError,
  fetchCapabilityGateway,
  requestCapabilityGateway,
} from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';

function artifactPath(runId: string, artifactId: string): string {
  return `runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/download`;
}

export const artifactDownload: Command = {
  service: 'analysis',
  resource: 'artifact',
  command: 'download',
  description: 'Download an analysis capability-gateway artifact by run_id and artifact_id. Keep run_id bound to artifact_id from the export result.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
    { name: 'artifact-id', type: 'string', required: true, desc: 'Artifact ID returned by the same export capability.' },
    { name: 'output', type: 'string', required: true, desc: 'Local output file path. Use a file path, not a directory.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      artifactPath(ctx.str('run-id'), ctx.str('artifact-id')),
    ),
    output_path: resolve(ctx.str('output')),
  }),
  execute: async (ctx) => {
    const runId = ctx.str('run-id');
    const artifactId = ctx.str('artifact-id');
    const outputPath = resolve(ctx.str('output'));
    await ensureArtifactReady(ctx.host(), runId, artifactId);
    const resp = await fetchArtifact(ctx.host(), runId, artifactId);
    const bytes = Buffer.from(await resp.arrayBuffer());
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes);
    return {
      run_id: runId,
      artifact_id: artifactId,
      output_path: outputPath,
      bytes: bytes.length,
      content_type: resp.headers.get('content-type') ?? undefined,
      content_encoding: resp.headers.get('content-encoding') ?? undefined,
      content_disposition: resp.headers.get('content-disposition') ?? undefined,
    };
  },
};

type RunDescriptor = {
  status?: string;
  artifact_id?: string;
  artifact_status?: string;
  error_message?: string | null;
};

async function ensureArtifactReady(host: string, runId: string, artifactId: string): Promise<void> {
  const descriptor = await inspectRun(host, runId);
  if (descriptor.artifact_id && descriptor.artifact_id !== artifactId) {
    throw new CapabilityGatewayError(
      `artifact_id ${artifactId} does not belong to run_id ${runId}`,
      'ARTIFACT_RUN_MISMATCH',
      400,
      'Use the run_id and artifact_id pair from the same export response.',
    );
  }
  if (descriptor.status === 'SUCCEEDED' && descriptor.artifact_status === 'COMPLETED') {
    return;
  }
  const reason = descriptor.error_message ? `; error=${descriptor.error_message}` : '';
  throw new CapabilityGatewayError(
    `Artifact is not ready: run_status=${descriptor.status ?? 'UNKNOWN'}, artifact_status=${descriptor.artifact_status ?? 'UNKNOWN'}${reason}`,
    'ARTIFACT_NOT_READY',
    409,
    'Run ae-cli analysis run inspect --run-id <run_id> until status=SUCCEEDED and artifact_status=COMPLETED, then retry artifact download. If status is FAILED or CANCELED, do not retry download.',
  );
}

async function inspectRun(host: string, runId: string): Promise<RunDescriptor> {
  return await requestCapabilityGateway(
    host,
    resolveGatewayDomain('analysis'),
    `runs/${encodeURIComponent(runId)}`,
  ) as RunDescriptor;
}

async function fetchArtifact(host: string, runId: string, artifactId: string): Promise<Response> {
  return fetchCapabilityGateway(
    host,
    resolveGatewayDomain('analysis'),
    artifactPath(runId, artifactId),
    'GET',
    undefined,
    'application/octet-stream',
  );
}
