import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, CapabilityGatewayError } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import {
  assertOutputPathAvailable,
  clientWaitTimeoutSeconds,
  downloadAnalysisArtifact,
  type AsyncRunDescriptor,
  validateLifecycleFlags,
  waitForAnalysisRun,
  withInterruptSignal,
} from '../../../core/analysis-async-artifact.js';

export const runWait: Command = {
  service: 'analysis',
  resource: 'run',
  command: 'wait',
  description: 'Resume waiting for an async run; optionally stream its completed artifact to a local file.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
    { name: 'wait-timeout-seconds', type: 'number', required: false, min: 1, max: 21600, desc: 'Maximum time this CLI process waits. Default: 600 seconds; expiry never cancels the remote run.' },
    { name: 'output', type: 'string', required: false, desc: 'After success, stream the artifact to this local file.' },
    { name: 'force', type: 'boolean', required: false, desc: 'Allow --output to atomically replace an existing file.' },
  ],
  risk: 'read',
  validate: (ctx) => validateLifecycleFlags(ctx, true),
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    ),
    wait_until_terminal: true,
    wait_timeout_seconds: clientWaitTimeoutSeconds(ctx),
    ...(ctx.str('output') ? { output_path: ctx.str('output') } : {}),
  }),
  execute: async (ctx) => {
    validateLifecycleFlags(ctx, true);
    const runId = ctx.str('run-id');
    const output = ctx.str('output');
    if (output) await assertOutputPathAvailable(output, ctx.bool('force'), { run_id: runId });
    return withInterruptSignal(async (signal) => {
      const descriptor = await waitForAnalysisRun(ctx.host(), runId, {
        signal,
        waitTimeoutSeconds: clientWaitTimeoutSeconds(ctx),
      });
      if (!output) return descriptor;
      const artifactId = artifactIdFrom(descriptor);
      if (!artifactId) {
        throw new CapabilityGatewayError(
          `Completed async run ${runId} has no artifact_id.`,
          'ASYNC_RUN_PROTOCOL_ERROR',
          502,
          `Inspect with: ae-cli analysis run inspect --run-id ${runId}`,
          { run_id: runId },
        );
      }
      const download = await downloadAnalysisArtifact(
        ctx.host(),
        runId,
        artifactId,
        output,
        { force: ctx.bool('force'), signal, ensureReady: false },
      );
      return { ...descriptor, ...download };
    }, runId);
  },
};

function artifactIdFrom(descriptor: AsyncRunDescriptor): string | undefined {
  return descriptor.artifact_id ?? descriptor.artifact?.artifact_id ?? descriptor.artifact?.id;
}
