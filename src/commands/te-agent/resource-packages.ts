import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { requestResourcePackageApi, resourcePackagePreflightChange } from './api-client.js';
import {
  clearUploadState, downloadArtifact, uploadPackage,
  type PackagePreflight, type PackageScope,
} from './resource-package-transfer.js';

const statuses = new Set([
  'uploading', 'preflighting', 'ready', 'queued', 'running', 'cancelling',
  'succeeded', 'partially_succeeded', 'failed', 'cancelled', 'cancel_failed',
]);
const terminal = new Set(['succeeded', 'partially_succeeded', 'failed', 'cancelled', 'cancel_failed']);
const resourceTypes = new Set(['knowledge_base', 'mcp', 'skill', 'agent', 'team']);
const previewNote = 'Dry-run previews the local request only; it does not check permissions or current resources.';

export interface PackageTask {
  id: string;
  kind: 'export' | 'import';
  scope: PackageScope;
  status: string;
  artifactAvailable: boolean;
  packageSha256: string | null;
  [key: string]: unknown;
}

type Reference = { type: string; sourceId: string };

function id(ctx: RuntimeContext, key: string, flag: string): string {
  const value = ctx.str(key);
  if (!value || value.trim() !== value || value.length > 191) {
    throw new CliValidationError(`--${flag} must be a non-empty identifier of at most 191 characters`);
  }
  return value;
}

function scope(ctx: RuntimeContext): PackageScope {
  const value = ctx.str('scope');
  if (value !== 'personal' && value !== 'company') {
    throw new CliValidationError('--scope must be personal or company');
  }
  return value;
}

function jsonSource(raw: string, flag: string): unknown {
  if (!raw) throw new CliValidationError(`--${flag} is required`);
  try {
    const text = raw === '-' ? readFileSync(0, 'utf8')
      : raw.startsWith('@') ? readFileSync(raw.slice(1), 'utf8') : raw;
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new CliValidationError(`--${flag} must contain valid JSON, @file JSON, or - for stdin: ${(error as Error).message}`);
  }
}

function references(ctx: RuntimeContext, key: 'roots' | 'excluded'): Reference[] {
  const raw = ctx.str(key);
  if (!raw && key === 'excluded') return [];
  const value = jsonSource(raw, key);
  const maximum = key === 'roots' ? 500 : 2_000;
  if (!Array.isArray(value) || (key === 'roots' && !value.length) || value.length > maximum ||
    value.some((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry) ||
      Object.keys(entry).sort().join(',') !== 'sourceId,type' ||
      !resourceTypes.has((entry as Reference).type) ||
      typeof (entry as Reference).sourceId !== 'string' ||
      !(entry as Reference).sourceId || (entry as Reference).sourceId.length > 191)) {
    throw new CliValidationError(`--${key} must be a JSON array of valid resource references (max ${maximum})`);
  }
  return value as Reference[];
}

function stringArray(ctx: RuntimeContext, key: string, flag: string): string[] {
  const raw = ctx.str(key);
  if (!raw) return [];
  const value = jsonSource(raw, flag);
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new CliValidationError(`--${flag} must be a JSON string array`);
  }
  return value as string[];
}

function replacementMap(ctx: RuntimeContext): Record<string, string> {
  const raw = ctx.str('systemReplacements');
  if (!raw) return {};
  const value = jsonSource(raw, 'system-replacements');
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.entries(value).length > 500 ||
    Object.entries(value).some(([key, target]) => !key || key.length > 64 ||
      typeof target !== 'string' || !target || target.length > 191)) {
    throw new CliValidationError('--system-replacements must be a JSON object of reference keys to target IDs');
  }
  return value as Record<string, string>;
}

function taskPath(ctx: RuntimeContext): string {
  return `/api/resource-packages/tasks/${encodeURIComponent(id(ctx, 'taskId', 'task-id'))}`;
}

function waitSettings(ctx: RuntimeContext): { timeoutMs: number; pollMs: number } {
  const seconds = ctx.optionalNum('waitTimeoutSeconds') ?? 1_800;
  const pollMs = ctx.optionalNum('pollIntervalMs') ?? 1_500;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86_400) {
    throw new CliValidationError('--wait-timeout-seconds must be an integer from 1 to 86400');
  }
  if (!Number.isInteger(pollMs) || pollMs < 250 || pollMs > 60_000) {
    throw new CliValidationError('--poll-interval-ms must be an integer from 250 to 60000');
  }
  return { timeoutMs: seconds * 1_000, pollMs };
}

async function waitForTask(ctx: RuntimeContext, task: PackageTask): Promise<{ task: PackageTask; timedOut: boolean }> {
  const { timeoutMs, pollMs } = waitSettings(ctx);
  const deadline = Date.now() + timeoutMs;
  let current = task;
  while (!terminal.has(current.status)) {
    if (Date.now() >= deadline) return { task: current, timedOut: true };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    current = await requestResourcePackageApi(ctx, 'GET', `/api/resource-packages/tasks/${encodeURIComponent(task.id)}`);
  }
  return { task: current, timedOut: false };
}

const taskIdFlag = { name: 'task-id', type: 'string' as const, required: true, desc: 'Resource package task ID' };
const waitFlags = [
  { name: 'no-wait', type: 'boolean' as const, desc: 'Return after submission without polling' },
  { name: 'wait-timeout-seconds', type: 'number' as const, desc: 'Maximum poll duration in seconds (default: 1800)' },
  { name: 'poll-interval-ms', type: 'number' as const, desc: 'Poll interval from 250 to 60000 milliseconds (default: 1500)' },
];

function listPath(ctx: RuntimeContext): string {
  const kind = ctx.str('kind');
  const selectedScope = ctx.str('scope');
  const status = ctx.str('status');
  if (kind && !['export', 'import'].includes(kind)) throw new CliValidationError('--kind must be export or import');
  if (selectedScope && !['personal', 'company'].includes(selectedScope)) throw new CliValidationError('--scope must be personal or company');
  if (status && !statuses.has(status)) throw new CliValidationError('--status is invalid');
  const page = ctx.optionalNum('page') ?? 1;
  const pageSize = ctx.optionalNum('pageSize') ?? 20;
  if (!Number.isSafeInteger(page) || page < 1) throw new CliValidationError('--page must be a positive integer');
  if (![20, 50, 100].includes(pageSize)) throw new CliValidationError('--page-size must be 20, 50, or 100');
  const query = new URLSearchParams();
  if (kind) query.set('kind', kind);
  if (selectedScope) query.set('scope', selectedScope);
  if (status) query.set('status', status);
  query.set('page', String(page)); query.set('pageSize', String(pageSize));
  return `/api/resource-packages/tasks?${query}`;
}

export const listResourcePackages: Command = {
  service: 'agent', resource: 'resource-package', command: 'list',
  description: 'List personal and company resource package tasks', helpText: previewNote,
  flags: [
    { name: 'kind', type: 'string', desc: 'Filter by export or import' },
    { name: 'scope', type: 'string', desc: 'Filter by personal or company' },
    { name: 'status', type: 'string', desc: 'Filter by task status' },
    { name: 'page', type: 'number', desc: 'Page number (default: 1)' },
    { name: 'page-size', type: 'number', desc: 'Page size: 20, 50, or 100 (default: 20)' },
  ], risk: 'read', validate: (ctx) => { listPath(ctx); },
  dryRun: (ctx) => ({ method: 'GET', url: listPath(ctx) }),
  execute: (ctx) => requestResourcePackageApi(ctx, 'GET', listPath(ctx)),
};

export const showResourcePackage: Command = {
  service: 'agent', resource: 'resource-package', command: 'show',
  description: 'Show a resource package task and its item results', flags: [taskIdFlag], risk: 'read',
  validate: (ctx) => { taskPath(ctx); }, dryRun: (ctx) => ({ method: 'GET', url: taskPath(ctx) }),
  execute: (ctx) => requestResourcePackageApi(ctx, 'GET', taskPath(ctx)),
};

export const previewResourcePackageExport: Command = {
  service: 'agent', resource: 'resource-package', command: 'export-preview',
  description: 'Preview export resources and dependencies', helpText: previewNote,
  flags: [{ name: 'roots', type: 'string', required: true, desc: 'JSON, @file, or stdin (-) array of resource references' }],
  risk: 'read', validate: (ctx) => { references(ctx, 'roots'); },
  dryRun: (ctx) => ({ method: 'POST', url: '/api/resource-packages/exports/preview', body: { roots: references(ctx, 'roots') } }),
  execute: (ctx) => requestResourcePackageApi(ctx, 'POST', '/api/resource-packages/exports/preview', { roots: references(ctx, 'roots') }),
};

function exportBody(ctx: RuntimeContext) {
  return {
    requestKey: ctx.str('requestKey') || randomUUID(), kind: 'export', scope: scope(ctx),
    payload: {
      roots: references(ctx, 'roots'), excluded: references(ctx, 'excluded'),
      ...(ctx.str('fileNameBase') ? { fileNameBase: ctx.str('fileNameBase') } : {}),
    },
  };
}

function validateExport(ctx: RuntimeContext): void {
  exportBody(ctx);
  if (ctx.str('requestKey')) id(ctx, 'requestKey', 'request-key');
  const base = ctx.str('fileNameBase');
  if (base && (base.length > 160 || !/^[^\\/\x00-\x1f]+$/.test(base))) {
    throw new CliValidationError('--file-name-base must be a safe filename base of at most 160 characters');
  }
  if (ctx.bool('noWait') && ctx.str('output')) throw new CliValidationError('--no-wait cannot be combined with --output');
  if (!ctx.bool('noWait')) waitSettings(ctx);
}

export const exportResourcePackage: Command = {
  service: 'agent', resource: 'resource-package', command: 'export',
  description: 'Export a personal or company resource package and download the artifact', helpText: previewNote,
  flags: [
    { name: 'scope', type: 'string', required: true, desc: 'Export scope: personal or company' },
    { name: 'roots', type: 'string', required: true, desc: 'JSON, @file, or stdin (-) array of root resources' },
    { name: 'excluded', type: 'string', desc: 'JSON or @file array of dependencies to exclude' },
    { name: 'file-name-base', type: 'string', desc: 'Optional output ZIP base name' },
    { name: 'request-key', type: 'string', desc: 'Optional idempotency key; reuse only for the same export' },
    { name: 'output', type: 'string', desc: 'Local ZIP path; defaults to the artifact filename' },
    { name: 'timezone', type: 'string', desc: 'IANA timezone for generated artifact filename (default: UTC)' },
    ...waitFlags,
  ], risk: 'write', validate: validateExport, preflight: validateExport,
  dryRun: (ctx) => ({ method: 'POST', url: '/api/resource-packages/tasks', body: exportBody(ctx) }),
  execute: async (ctx) => {
    let task = await requestResourcePackageApi<PackageTask>(ctx, 'POST', '/api/resource-packages/tasks', exportBody(ctx));
    if (ctx.bool('noWait')) return { status: 'submitted', task };
    const waited = await waitForTask(ctx, task);
    task = waited.task;
    if (waited.timedOut) return { status: 'still_running', task };
    if (task.status !== 'succeeded' || !task.artifactAvailable) return { status: 'completed', task };
    const artifact = await downloadArtifact(ctx, task, ctx.str('output') || undefined, ctx.str('timezone') || undefined);
    return { status: 'downloaded', task, artifact };
  },
};

function validateImport(ctx: RuntimeContext): void {
  if (!ctx.str('file')) throw new CliValidationError('--file is required');
  scope(ctx); stringArray(ctx, 'confirmations', 'confirmations'); replacementMap(ctx);
  if (ctx.str('uploadId')) id(ctx, 'uploadId', 'upload-id');
  if (ctx.str('requestKey')) id(ctx, 'requestKey', 'request-key');
  if (!ctx.bool('noWait')) waitSettings(ctx);
}

export function reviewPreflight(preflight: PackagePreflight, replacements: Record<string, string>, confirmations: string[]) {
  const unresolvedBlockers = preflight.blockers.filter((item) => {
    if (item.code !== 'CORE_SYSTEM_AGENT_UNRESOLVED' || !item.referenceKey) return true;
    const replacement = replacements[item.referenceKey];
    return !replacement || (replacement !== '__skip_resource__' &&
      !item.replacementCandidates?.some((candidate) => candidate.id === replacement));
  });
  const missingConfirmations = preflight.confirmations.filter((item) => !confirmations.includes(item.code));
  return { unresolvedBlockers, missingConfirmations };
}

export const importResourcePackage: Command = {
  service: 'agent', resource: 'resource-package', command: 'import',
  description: 'Upload, preflight, confirm, and import a resource package with resume support',
  flags: [
    { name: 'file', type: 'string', required: true, desc: 'Path to a non-empty resource package ZIP' },
    { name: 'scope', type: 'string', required: true, desc: 'Import scope: personal or company' },
    { name: 'upload-id', type: 'string', desc: 'Explicit upload ID to resume' },
    { name: 'request-key', type: 'string', desc: 'Optional idempotency key; reuse only for the same import' },
    { name: 'confirmations', type: 'string', desc: 'JSON or @file array of required confirmation codes' },
    { name: 'system-replacements', type: 'string', desc: 'JSON or @file mapping of reference keys to target IDs or __skip_resource__' },
    { name: 'accept-warnings', type: 'boolean', desc: 'Accept all warnings from the current preflight snapshot' },
    { name: 'allow-duplicate', type: 'boolean', desc: 'Allow a package previously imported successfully' },
    ...waitFlags,
  ], risk: 'write', validate: validateImport, preflight: validateImport,
  dryRun: (ctx) => ({ method: 'WORKFLOW', url: '/api/resource-packages/uploads', body: {
    file: ctx.str('file'), scope: scope(ctx), resume: true, wait: !ctx.bool('noWait'),
  } }),
  execute: async (ctx) => {
    const { completed, statePath, requestKey } = await uploadPackage(ctx, {
      filePath: ctx.str('file'), scope: scope(ctx), uploadId: ctx.str('uploadId') || undefined,
      requestKey: ctx.str('requestKey') || undefined,
    });
    const confirmations = stringArray(ctx, 'confirmations', 'confirmations');
    const replacements = replacementMap(ctx);
    const review = reviewPreflight(completed.preflight, replacements, confirmations);
    if ((completed.duplicateImport && !ctx.bool('allowDuplicate')) ||
      (completed.preflight.warnings.length && !ctx.bool('acceptWarnings')) ||
      review.unresolvedBlockers.length || review.missingConfirmations.length) {
      return { status: 'review_required', uploadId: completed.uploadId, requestKey,
        duplicateImport: completed.duplicateImport, preflight: completed.preflight, ...review };
    }
    let task: PackageTask;
    try {
      task = await requestResourcePackageApi<PackageTask>(ctx, 'POST',
        `/api/resource-packages/uploads/${encodeURIComponent(completed.uploadId)}/confirm`, {
          requestKey,
          preflightSnapshotId: completed.preflight.snapshotId,
          confirmations, systemReplacements: replacements,
        });
    } catch (error) {
      const changed = resourcePackagePreflightChange(error);
      if (changed) return { status: 'review_required', reason: 'preflight_changed',
        uploadId: completed.uploadId, requestKey, preflight: changed };
      throw error;
    }
    await clearUploadState(statePath);
    if (ctx.bool('noWait')) return { status: 'submitted', task };
    const waited = await waitForTask(ctx, task);
    return { status: waited.timedOut ? 'still_running' : 'completed', task: waited.task };
  },
};

export const downloadResourcePackageCommand: Command = {
  service: 'agent', resource: 'resource-package', command: 'download',
  description: 'Download or resume a completed export artifact and verify its SHA-256',
  flags: [taskIdFlag,
    { name: 'output', type: 'string', desc: 'Local ZIP path; defaults to the artifact filename' },
    { name: 'timezone', type: 'string', desc: 'IANA timezone for generated artifact filename (default: UTC)' },
  ], risk: 'read', validate: (ctx) => { taskPath(ctx); },
  dryRun: (ctx) => ({ method: 'GET', url: `${taskPath(ctx)}/artifact` }),
  execute: async (ctx) => {
    const task = await requestResourcePackageApi<PackageTask>(ctx, 'GET', taskPath(ctx));
    if (task.kind !== 'export' || task.status !== 'succeeded' || !task.artifactAvailable) {
      throw new Error('This task does not have an available export artifact');
    }
    return downloadArtifact(ctx, task, ctx.str('output') || undefined, ctx.str('timezone') || undefined);
  },
};

export const cancelResourcePackage: Command = {
  service: 'agent', resource: 'resource-package', command: 'cancel',
  description: 'Request cancellation of a running resource package task', flags: [taskIdFlag], risk: 'high-risk-write',
  validate: (ctx) => { taskPath(ctx); }, dryRun: (ctx) => ({ method: 'POST', url: `${taskPath(ctx)}/cancel` }),
  execute: (ctx) => requestResourcePackageApi(ctx, 'POST', `${taskPath(ctx)}/cancel`, {}),
};

export const retryResourcePackage: Command = {
  service: 'agent', resource: 'resource-package', command: 'retry',
  description: 'Retry a retryable failed resource package task', flags: [taskIdFlag, ...waitFlags], risk: 'write',
  validate: (ctx) => { taskPath(ctx); if (!ctx.bool('noWait')) waitSettings(ctx); },
  dryRun: (ctx) => ({ method: 'POST', url: `${taskPath(ctx)}/retry` }),
  execute: async (ctx) => {
    const task = await requestResourcePackageApi<PackageTask>(ctx, 'POST', `${taskPath(ctx)}/retry`, {});
    if (ctx.bool('noWait')) return { status: 'submitted', task };
    const waited = await waitForTask(ctx, task);
    return { status: waited.timedOut ? 'still_running' : 'completed', task: waited.task };
  },
};

export const resourcePackageCommands: Command[] = [
  listResourcePackages, showResourcePackage, previewResourcePackageExport, exportResourcePackage,
  importResourcePackage, downloadResourcePackageCommand, cancelResourcePackage, retryResourcePackage,
];
