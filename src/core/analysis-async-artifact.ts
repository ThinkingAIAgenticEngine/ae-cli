import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, link, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { Command, Flag, RuntimeContext } from '../framework/types.js';
import { readOutputMetadata, unwrapOutputData, withOutputMetadata } from '../framework/output.js';
import {
  CapabilityGatewayError,
  fetchCapabilityGateway,
  requestCapabilityGateway,
} from './capability-api.js';
import { resolveGatewayDomain } from './capability-routing.js';
import { PermissionError } from './errors.js';

const MATERIALIZATION_GRACE_MS = 60_000;
const DEFAULT_EFFECTIVE_TIMEOUT_MS = 21_600_000;
const DEFAULT_WAIT_TIMEOUT_SECONDS = 600;
const MAX_WAIT_TIMEOUT_SECONDS = 21_600;
const MAX_TRANSIENT_FAILURES = 3;

export const asyncArtifactLifecycleFlags: Flag[] = [
  {
    name: 'wait',
    type: 'boolean',
    required: false,
    desc: 'Wait for the remote run and artifact to reach a terminal state. Polling uses short inspect requests; interrupting does not cancel the remote run.',
  },
  {
    name: 'wait-timeout-seconds',
    type: 'number',
    required: false,
    min: 1,
    max: MAX_WAIT_TIMEOUT_SECONDS,
    desc: 'Maximum time this CLI process waits. Default: 600 seconds; expiry never cancels the remote run.',
  },
  {
    name: 'output',
    type: 'string',
    required: false,
    desc: 'Wait, then stream the completed artifact to this local file. Implies --wait.',
  },
  {
    name: 'force',
    type: 'boolean',
    required: false,
    desc: 'Allow --output to atomically replace an existing file. Without this flag, existing paths are refused.',
  },
];

export type AsyncRunDescriptor = {
  run_id?: string;
  artifact_id?: string;
  status?: string;
  run_status?: string;
  artifact_status?: string;
  deadline_at?: string | number;
  expires_at?: string | number;
  effective_timeout_seconds?: number;
  error?: unknown;
  error_message?: string | null;
  artifact?: {
    artifact_id?: string;
    id?: string;
    status?: string;
    error?: unknown;
    error_message?: string | null;
  };
  [key: string]: unknown;
};

export type ArtifactDownloadResult = {
  run_id: string;
  artifact_id: string;
  output_path: string;
  bytes: number;
  content_type?: string;
  content_encoding?: string;
  content_disposition?: string;
};

export type WaitOptions = {
  expectedArtifactId?: string;
  initialDescriptor?: AsyncRunDescriptor;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  inspect?: (host: string, runId: string) => Promise<AsyncRunDescriptor>;
  waitTimeoutSeconds?: number;
};

export type AsyncArtifactLifecycleOptions = {
  preflightOutput?: (args: {
    ctx: RuntimeContext;
    output: string;
    force: boolean;
  }) => Promise<void>;
  materialize?: (args: {
    ctx: RuntimeContext;
    runId: string;
    artifactId: string;
    output: string;
    force: boolean;
    signal: AbortSignal;
    finalDescriptor: AsyncRunDescriptor;
  }) => Promise<unknown>;
};

export function withAsyncArtifactLifecycle(
  command: Command,
  options: AsyncArtifactLifecycleOptions = {},
): Command {
  const originalValidate = command.validate;
  const originalPreflight = command.preflight;

  return {
    ...command,
    flags: [...command.flags, ...asyncArtifactLifecycleFlags],
    validate: (ctx) => {
      originalValidate?.(ctx);
      validateLifecycleFlags(ctx);
    },
    preflight: (ctx) => {
      originalPreflight?.(ctx);
      validateLifecycleFlags(ctx);
    },
    execute: async (ctx) => {
      validateLifecycleFlags(ctx);
      const output = optionalString(ctx, 'output');
      if (output) {
        if (options.preflightOutput) {
          await options.preflightOutput({
            ctx,
            output,
            force: ctx.bool('force'),
          });
        } else {
          await assertOutputPathAvailable(output, ctx.bool('force'));
        }
      }
      const submission = await command.execute(ctx);
      const descriptor = asDescriptor(unwrapOutputData(submission));
      const runId = nonEmptyString(descriptor.run_id);
      const artifactId = descriptorArtifactId(descriptor);
      if (!runId || !artifactId) {
        throw protocolError(
          'Async artifact submission did not return both run_id and artifact_id.',
          runId,
        );
      }

      announceSubmitted(runId, artifactId);
      if (!ctx.bool('wait') && output === undefined) {
        return submission;
      }

      const finalResult = await withInterruptSignal(async (signal) => {
        const finalDescriptor = await waitForAnalysisRun(ctx.host(), runId, {
          expectedArtifactId: artifactId,
          initialDescriptor: descriptor,
          signal,
          waitTimeoutSeconds: clientWaitTimeoutSeconds(ctx),
        });
        if (!output) return finalDescriptor;
        const download = options.materialize
          ? await options.materialize({
            ctx,
            runId,
            artifactId,
            output,
            force: ctx.bool('force'),
            signal,
            finalDescriptor,
          })
          : await downloadAnalysisArtifact(
            ctx.host(),
            runId,
            artifactId,
            output,
            { force: ctx.bool('force'), signal, ensureReady: false },
          );
        return { ...finalDescriptor, ...download };
      }, runId);

      return withOutputMetadata(finalResult, readOutputMetadata(submission));
    },
  };
}

export async function waitForAnalysisRun(
  host: string,
  runId: string,
  options: WaitOptions = {},
): Promise<AsyncRunDescriptor> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? abortableSleep;
  const inspect = options.inspect ?? inspectAnalysisRun;
  const startedAt = now();
  const waitTimeoutSeconds = options.waitTimeoutSeconds ?? DEFAULT_WAIT_TIMEOUT_SECONDS;
  const clientDeadline = startedAt + waitTimeoutSeconds * 1_000;
  let deadline = deriveDeadline(options.initialDescriptor, startedAt);
  let delayMs = 1_000;
  let transientFailures = 0;
  let lastState = '';
  let materializationStartedAt: number | undefined;
  let descriptor = options.initialDescriptor;

  while (true) {
    throwIfAborted(options.signal, runId);
    // Submission responses are only required to identify the lifecycle. If they omit status,
    // obtain the authoritative state from the inspect endpoint instead of guessing a state.
    if (descriptor !== undefined && descriptorRunStatus(descriptor) === undefined) {
      descriptor = undefined;
    }
    if (descriptor === undefined) {
      try {
        descriptor = asDescriptor(await inspect(host, runId));
        transientFailures = 0;
      } catch (error) {
        if (error instanceof PermissionError) throw error;
        if (error instanceof CapabilityGatewayError && error.httpStatus === 404) {
          throw new CapabilityGatewayError(
            `Async run ${runId} was not found on the current host.`,
            'ASYNC_RUN_NOT_FOUND',
            404,
            'Do not keep polling. Verify that the run ID belongs to this host and that the run lifecycle route is deployed.',
            { run_id: runId },
          );
        }
        if (!isTransientPollError(error) || ++transientFailures >= MAX_TRANSIENT_FAILURES) {
          throw waitError(
            `Could not inspect async run ${runId}${transientFailures > 0 ? ` after ${transientFailures} transient failures` : ''}.`,
            'ASYNC_RUN_INSPECT_FAILED',
            runId,
            error,
          );
        }
        await sleep(delayMs, options.signal);
        delayMs = nextDelay(delayMs);
        continue;
      }
    }

    deadline = Math.min(deadline, deriveDeadline(descriptor, startedAt));
    const runStatus = descriptorRunStatus(descriptor);
    const artifactStatus = normalizedStatus(descriptor.artifact_status ?? descriptor.artifact?.status);
    const artifactId = descriptorArtifactId(descriptor);
    if (options.expectedArtifactId && artifactId && artifactId !== options.expectedArtifactId) {
      throw new CapabilityGatewayError(
        `artifact_id ${artifactId} does not match the submitted artifact ${options.expectedArtifactId}.`,
        'ARTIFACT_RUN_MISMATCH',
        400,
        resumeHint(runId),
        { run_id: runId, artifact_id: artifactId, expected_artifact_id: options.expectedArtifactId },
      );
    }

    const state = `${runStatus || 'UNKNOWN'}/${artifactStatus || 'UNKNOWN'}`;
    if (state !== lastState) {
      process.stderr.write(`[ae-cli] run_id=${runId} state=${state}\n`);
      lastState = state;
    }

    if (runStatus === 'FAILED' || runStatus === 'CANCELED') {
      throw terminalError(descriptor, runId, `Run ended with status ${runStatus}.`);
    }
    if (artifactStatus === 'FAILED' || artifactStatus === 'CANCELED') {
      throw terminalError(descriptor, runId, `Artifact ended with status ${artifactStatus}.`);
    }
    if (runStatus === 'SUCCEEDED' && artifactStatus === 'COMPLETED') {
      if (!artifactId) {
        throw protocolError('Completed async run has no artifact_id.', runId);
      }
      return descriptor;
    }
    if (runStatus !== 'RUNNING' && runStatus !== 'SUCCEEDED') {
      throw protocolError(`Unknown async run status: ${runStatus || 'missing'}.`, runId);
    }
    if (artifactStatus && artifactStatus !== 'RUNNING' && artifactStatus !== 'COMPLETED') {
      throw protocolError(`Unknown async artifact status: ${artifactStatus}.`, runId);
    }
    if (runStatus === 'RUNNING' && artifactStatus === 'COMPLETED') {
      throw protocolError('Artifact is COMPLETED while its run is still RUNNING.', runId);
    }

    if (runStatus === 'SUCCEEDED' && materializationStartedAt === undefined) {
      materializationStartedAt = now();
    }
    const lifecycleDeadline = materializationStartedAt === undefined
      ? deadline
      : Math.min(deadline, materializationStartedAt + MATERIALIZATION_GRACE_MS);
    const effectiveDeadline = Math.min(clientDeadline, lifecycleDeadline);
    if (now() >= effectiveDeadline) {
      if (clientDeadline <= lifecycleDeadline) {
        throw waitError(
          `Stopped waiting after ${waitTimeoutSeconds} seconds for run ${runId}. The remote run was not canceled.`,
          'ASYNC_WAIT_TIMEOUT',
          runId,
          undefined,
          descriptor,
          { wait_timeout_seconds: waitTimeoutSeconds },
        );
      }
      throw waitError(
        `Stopped waiting because the server-declared deadline for run ${runId} was reached. The remote run was not canceled.`,
        'ASYNC_WAIT_DEADLINE_REACHED',
        runId,
        undefined,
        descriptor,
      );
    }

    await sleep(Math.min(delayMs, Math.max(0, effectiveDeadline - now())), options.signal);
    delayMs = nextDelay(delayMs);
    descriptor = undefined;
  }
}

export async function downloadAnalysisArtifact(
  host: string,
  runId: string,
  artifactId: string,
  output: string,
  options: { force?: boolean; signal?: AbortSignal; ensureReady?: boolean } = {},
): Promise<ArtifactDownloadResult> {
  const outputPath = resolve(output);
  await assertOutputPathAvailable(outputPath, options.force, { run_id: runId, artifact_id: artifactId });
  if (options.ensureReady !== false) {
    const descriptor = await inspectAnalysisRun(host, runId);
    ensureCompletedDescriptor(descriptor, runId, artifactId);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const tempPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.part-${process.pid}-${randomBytes(6).toString('hex')}`,
  );
  let tempPresent = false;
  try {
    throwIfAborted(options.signal, runId);
    const response = await fetchArtifact(host, runId, artifactId);
    if (!response.body) {
      throw protocolError('Artifact download response has no body.', runId);
    }
    tempPresent = true;
    const source = Readable.fromWeb(response.body as any);
    await pipeline(source, createWriteStream(tempPath, { flags: 'wx' }), {
      signal: options.signal,
    });
    const file = await stat(tempPath);

    if (options.force) {
      await rename(tempPath, outputPath);
    } else {
      try {
        await link(tempPath, outputPath);
      } catch (error: any) {
        if (error?.code === 'EEXIST') {
          throw new CapabilityGatewayError(
            `Output path already exists: ${outputPath}`,
            'OUTPUT_ALREADY_EXISTS',
            409,
            'Choose another --output path or pass --force to replace the existing file.',
            { run_id: runId, artifact_id: artifactId, output_path: outputPath },
          );
        }
        throw error;
      }
      await unlink(tempPath);
    }
    tempPresent = false;
    return {
      run_id: runId,
      artifact_id: artifactId,
      output_path: outputPath,
      bytes: file.size,
      content_type: response.headers.get('content-type') ?? undefined,
      content_encoding: response.headers.get('content-encoding') ?? undefined,
      content_disposition: response.headers.get('content-disposition') ?? undefined,
    };
  } catch (error) {
    if (options.signal?.aborted) {
      throw interruptedError(runId);
    }
    throw error;
  } finally {
    if (tempPresent) await unlink(tempPath).catch(() => undefined);
  }
}

export function validateLifecycleFlags(ctx: RuntimeContext, waitImplied = false): void {
  const output = optionalString(ctx, 'output');
  if (ctx.bool('force') && output === undefined) {
    const error = new Error('--force requires --output.');
    (error as any).type = 'validation';
    throw error;
  }
  const waitTimeout = optionalContextNumber(ctx, 'wait-timeout-seconds');
  if (waitTimeout !== undefined) {
    if (!Number.isInteger(waitTimeout)
      || waitTimeout < 1
      || waitTimeout > MAX_WAIT_TIMEOUT_SECONDS) {
      const error = new Error(`--wait-timeout-seconds must be an integer between 1 and ${MAX_WAIT_TIMEOUT_SECONDS}.`);
      (error as any).type = 'validation';
      throw error;
    }
    if (!waitImplied && !ctx.bool('wait') && output === undefined) {
      const error = new Error('--wait-timeout-seconds requires --wait or --output.');
      (error as any).type = 'validation';
      throw error;
    }
  }
}

export function clientWaitTimeoutSeconds(ctx: RuntimeContext): number {
  return optionalContextNumber(ctx, 'wait-timeout-seconds') ?? DEFAULT_WAIT_TIMEOUT_SECONDS;
}

function optionalContextNumber(ctx: RuntimeContext, name: string): number | undefined {
  if (typeof ctx.optionalNum === 'function') {
    return ctx.optionalNum(name);
  }
  const raw = ctx.str(name);
  return raw.trim() === '' ? undefined : Number(raw);
}

export async function assertOutputPathAvailable(
  output: string,
  force = false,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const outputPath = resolve(output);
  if (force || !await pathExists(outputPath)) return;
  throw new CapabilityGatewayError(
    `Output path already exists: ${outputPath}`,
    'OUTPUT_ALREADY_EXISTS',
    409,
    'Choose another --output path or pass --force to replace the existing file.',
    { ...meta, output_path: outputPath },
  );
}

export async function withInterruptSignal<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  runId: string,
): Promise<T> {
  const controller = new AbortController();
  const onInterrupt = () => controller.abort();
  process.once('SIGINT', onInterrupt);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw interruptedError(runId);
    throw error;
  } finally {
    process.removeListener('SIGINT', onInterrupt);
  }
}

export async function inspectAnalysisRun(host: string, runId: string): Promise<AsyncRunDescriptor> {
  return asDescriptor(await requestCapabilityGateway(
    host,
    resolveGatewayDomain('analysis'),
    `runs/${encodeURIComponent(runId)}`,
  ));
}

function ensureCompletedDescriptor(
  descriptor: AsyncRunDescriptor,
  runId: string,
  artifactId: string,
): void {
  const actualArtifactId = descriptorArtifactId(descriptor);
  if (actualArtifactId && actualArtifactId !== artifactId) {
    throw new CapabilityGatewayError(
      `artifact_id ${artifactId} does not belong to run_id ${runId}`,
      'ARTIFACT_RUN_MISMATCH',
      400,
      'Use the run_id and artifact_id pair from the same export response.',
    );
  }
  const runStatus = descriptorRunStatus(descriptor);
  const artifactStatus = normalizedStatus(descriptor.artifact_status ?? descriptor.artifact?.status);
  if (runStatus === 'SUCCEEDED' && artifactStatus === 'COMPLETED') return;
  if (runStatus === 'FAILED' || runStatus === 'CANCELED' || artifactStatus === 'FAILED' || artifactStatus === 'CANCELED') {
    throw terminalError(descriptor, runId, 'Artifact cannot be downloaded because the remote lifecycle failed.');
  }
  throw new CapabilityGatewayError(
    `Artifact is not ready: run_status=${runStatus || 'UNKNOWN'}, artifact_status=${artifactStatus || 'UNKNOWN'}`,
    'ARTIFACT_NOT_READY',
    409,
    `Resume with: ae-cli analysis run wait --run-id ${runId}`,
    { run_id: runId, artifact_id: artifactId },
  );
}

function descriptorArtifactId(descriptor: AsyncRunDescriptor): string | undefined {
  return nonEmptyString(descriptor.artifact_id)
    ?? nonEmptyString(descriptor.artifact?.artifact_id)
    ?? nonEmptyString(descriptor.artifact?.id);
}

function descriptorRunStatus(descriptor: AsyncRunDescriptor): string | undefined {
  return normalizedStatus(descriptor.status ?? descriptor.run_status);
}

function deriveDeadline(descriptor: AsyncRunDescriptor | undefined, fallbackFrom: number): number {
  const declaredDeadline = timestampMillis(descriptor?.deadline_at);
  if (declaredDeadline !== undefined) return declaredDeadline + MATERIALIZATION_GRACE_MS;
  const expiresAt = timestampMillis(descriptor?.expires_at);
  if (expiresAt !== undefined) return expiresAt;
  const effectiveTimeout = Number(descriptor?.effective_timeout_seconds);
  if (Number.isFinite(effectiveTimeout) && effectiveTimeout > 0) {
    return fallbackFrom + effectiveTimeout * 1_000 + MATERIALIZATION_GRACE_MS;
  }
  return fallbackFrom + DEFAULT_EFFECTIVE_TIMEOUT_MS + MATERIALIZATION_GRACE_MS;
}

function timestampMillis(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1_000 : value;
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return timestampMillis(numeric);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nextDelay(current: number): number {
  return Math.min(5_000, Math.ceil(current * 1.5));
}

function normalizedStatus(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : undefined;
}

function asDescriptor(value: unknown): AsyncRunDescriptor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw protocolError('Async run response is not an object.');
  }
  return value as AsyncRunDescriptor;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  return nonEmptyString(ctx.str(name));
}

function terminalError(
  descriptor: AsyncRunDescriptor,
  runId: string,
  message: string,
): CapabilityGatewayError {
  return new CapabilityGatewayError(
    message,
    'ASYNC_RUN_TERMINAL_FAILURE',
    409,
    `The remote lifecycle is terminal and will not succeed on retry. Inspect details with: ae-cli analysis run inspect --run-id ${runId}`,
    {
      run_id: runId,
      artifact_id: descriptorArtifactId(descriptor),
      run_status: descriptorRunStatus(descriptor),
      artifact_status: normalizedStatus(descriptor.artifact_status ?? descriptor.artifact?.status),
      error: descriptor.error ?? descriptor.artifact?.error ?? descriptor.error_message ?? descriptor.artifact?.error_message,
    },
  );
}

function protocolError(message: string, runId?: string): CapabilityGatewayError {
  return new CapabilityGatewayError(
    message,
    'ASYNC_RUN_PROTOCOL_ERROR',
    502,
    runId ? resumeHint(runId) : 'Inspect the gateway response and verify the async run contract.',
    runId ? { run_id: runId } : undefined,
  );
}

function waitError(
  message: string,
  code: string,
  runId: string,
  cause?: unknown,
  descriptor?: AsyncRunDescriptor,
  extraMeta: Record<string, unknown> = {},
): CapabilityGatewayError {
  const resumeCommand = `ae-cli analysis run wait --run-id ${runId}`;
  const error = new CapabilityGatewayError(
    message,
    code,
    undefined,
    resumeHint(runId),
    {
      run_id: runId,
      artifact_id: descriptor ? descriptorArtifactId(descriptor) : undefined,
      run_status: descriptor ? descriptorRunStatus(descriptor) : undefined,
      artifact_status: descriptor
        ? normalizedStatus(descriptor.artifact_status ?? descriptor.artifact?.status)
        : undefined,
      remote_run_canceled: false,
      resume_command: resumeCommand,
      ...extraMeta,
    },
  );
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

function interruptedError(runId: string): CapabilityGatewayError {
  return waitError(
    `Stopped waiting for run ${runId}. The remote run was not canceled.`,
    'ASYNC_WAIT_INTERRUPTED',
    runId,
  );
}

function resumeHint(runId: string): string {
  return `Resume with: ae-cli analysis run wait --run-id ${runId}`;
}

function announceSubmitted(runId: string, artifactId: string): void {
  process.stderr.write(
    `[ae-cli] async run submitted run_id=${runId} artifact_id=${artifactId}; ${resumeHint(runId)}\n`,
  );
}

function isTransientPollError(error: unknown): boolean {
  if (error instanceof CapabilityGatewayError) {
    return error.httpStatus === 429 || (error.httpStatus !== undefined && error.httpStatus >= 500);
  }
  return error instanceof TypeError || (error instanceof Error && /fetch|network|socket|timeout/i.test(error.message));
}

function throwIfAborted(signal: AbortSignal | undefined, runId: string): void {
  if (signal?.aborted) throw interruptedError(runId);
}

async function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolveSleep, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      signal?.removeEventListener('abort', onAbort);
      resolveSleep();
    };
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('The operation was aborted', 'AbortError'));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(finish, milliseconds);
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function artifactPath(runId: string, artifactId: string): string {
  return `runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/download`;
}

function fetchArtifact(host: string, runId: string, artifactId: string): Promise<Response> {
  return fetchCapabilityGateway(
    host,
    resolveGatewayDomain('analysis'),
    artifactPath(runId, artifactId),
    'GET',
    undefined,
    'application/octet-stream',
  );
}
