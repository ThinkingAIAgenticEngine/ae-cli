import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { tryLoadTeAgentSandboxCredentials } from '../../core/te-agent-credentials.js';
import {
  assertEnum,
  createAdminCommand,
  encodeId,
  getAdmin,
  optionalJsonObject,
  optionalString,
  requireBoundedStringArray,
  uploadAdminForm,
  withQuery,
} from './shared.js';
import {
  createNpmInstallRoot,
  createToolArchive,
  manifestFromNpmPackage,
  parseExactNpmPackageSpec,
  removeTemporaryTree,
  writeGeneratedManifest,
  type NpmPackageJson,
} from './sandbox-tool-package.js';

const TOOL_UPLOAD_PATH = '/api/admin/sandbox-tools';
const TOOL_UPLOAD_POLICY_PATH = '/api/admin/sandbox-tools/upload-policy';
const NPM_INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const TARGET_MODES = ['selected', 'all-running'] as const;
const OPERATION_ACTIONS = ['activate', 'deactivate'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

interface ToolUploadPolicy {
  enabled: boolean;
  archiveFormat: 'zip';
  manifestFile: 'tool.json';
  limits: {
    maxArchiveBytes: number;
    maxUnpackedBytes: number;
    maxFileBytes: number;
    maxFiles: number;
  };
}

function optionalFlag(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value || undefined;
}

function optionalBoundedStringArray(
  ctx: RuntimeContext,
  name: string,
  max: number,
): string[] | undefined {
  return optionalString(ctx, name) ? requireBoundedStringArray(ctx, name, max) : undefined;
}

function validateCommandNamesByToolId(
  value: Record<string, unknown> | undefined,
  toolIds: string[],
): Record<string, string[]> | undefined {
  if (!value) return undefined;
  const normalized: Record<string, string[]> = {};
  for (const [toolId, commandNames] of Object.entries(value)) {
    if (!toolIds.includes(toolId)) {
      throw new CliValidationError('--command-names-by-tool-id keys must exist in --tool-ids');
    }
    if (
      !Array.isArray(commandNames)
      || commandNames.length === 0
      || commandNames.length > 64
      || commandNames.some((name) => typeof name !== 'string' || !name.trim())
    ) {
      throw new CliValidationError(
        '--command-names-by-tool-id values must be arrays of 1-64 non-empty command names',
      );
    }
    normalized[toolId] = (commandNames as string[]).map((name) => name.trim());
  }
  return normalized;
}

function validateExpectedSnapshots(
  value: Record<string, unknown> | undefined,
  toolIds: string[],
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const normalized: Record<string, unknown> = {};
  for (const [toolId, snapshot] of Object.entries(value)) {
    if (!toolIds.includes(toolId)) {
      throw new CliValidationError('--expected-tool-snapshots-by-id keys must exist in --tool-ids');
    }
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new CliValidationError('--expected-tool-snapshots-by-id values must be objects');
    }
    const item = snapshot as Record<string, unknown>;
    if (
      typeof item.name !== 'string'
      || !item.name.trim()
      || (item.version !== null && typeof item.version !== 'string')
      || typeof item.packagePath !== 'string'
      || !item.packagePath.trim()
      || !Array.isArray(item.commands)
      || item.commands.length === 0
      || item.commands.length > 64
      || item.commands.some((name) => typeof name !== 'string' || !name.trim())
    ) {
      throw new CliValidationError(
        '--expected-tool-snapshots-by-id contains an invalid tool snapshot',
      );
    }
    normalized[toolId] = {
      name: (item.name as string).trim(),
      version: item.version,
      packagePath: (item.packagePath as string).trim(),
      commands: (item.commands as string[]).map((name) => name.trim()),
    };
  }
  return normalized;
}

function sandboxToolOperationBody(ctx: RuntimeContext): Record<string, unknown> {
  const mode = optionalString(ctx, 'target-mode');
  assertEnum('target-mode', mode, TARGET_MODES);
  const sandboxIds = optionalBoundedStringArray(ctx, 'sandbox-ids', 50);
  if (mode === 'selected' && !sandboxIds) {
    throw new CliValidationError('selected mode requires --sandbox-ids with 1-50 sandbox IDs');
  }
  if (mode === 'all-running' && sandboxIds) {
    throw new CliValidationError('all-running mode does not accept --sandbox-ids');
  }
  const toolIds = requireBoundedStringArray(ctx, 'tool-ids', 20);
  const commandNamesByToolId = validateCommandNamesByToolId(
    optionalJsonObject(ctx, 'command-names-by-tool-id'),
    toolIds,
  );
  const expectedToolSnapshotsById = validateExpectedSnapshots(
    optionalJsonObject(ctx, 'expected-tool-snapshots-by-id'),
    toolIds,
  );
  return {
    target: { mode, ...(sandboxIds ? { sandboxIds } : {}) },
    toolIds,
    ...(commandNamesByToolId ? { commandNamesByToolId } : {}),
    ...(expectedToolSnapshotsById ? { expectedToolSnapshotsById } : {}),
  };
}

const TOOL_OPERATION_FLAGS = [
  { name: 'target-mode', type: 'string' as const, required: true, desc: `Target mode: ${TARGET_MODES.join(' | ')}` },
  { name: 'sandbox-ids', type: 'string' as const, sensitive: true, desc: 'Selected mode only: JSON/@file array of 1-50 sandbox IDs' },
  { name: 'tool-ids', type: 'string' as const, required: true, desc: 'JSON/@file array of 1-20 sandbox tool IDs' },
  { name: 'command-names-by-tool-id', type: 'string' as const, desc: 'Optional JSON/@file map of tool ID to selected command names' },
  { name: 'expected-tool-snapshots-by-id', type: 'string' as const, sensitive: true, desc: 'Optional JSON/@file optimistic-lock snapshots keyed by tool ID' },
];

async function requireUploadPolicy(
  ctx: RuntimeContext,
): Promise<ToolUploadPolicy> {
  const policy = await getAdmin<ToolUploadPolicy>(
    TOOL_UPLOAD_POLICY_PATH,
    ctx.host(),
  );
  if (
    !policy ||
    policy.enabled !== true ||
    policy.archiveFormat !== 'zip' ||
    policy.manifestFile !== 'tool.json' ||
    !policy.limits ||
    !Number.isFinite(policy.limits.maxArchiveBytes)
  ) {
    throw new CliValidationError(
      'The server returned an invalid sandbox tool upload policy',
    );
  }
  return policy;
}

function requireLinuxSandbox(): void {
  const credentials = tryLoadTeAgentSandboxCredentials();
  if (
    process.platform !== 'linux' ||
    !credentials?.sandboxId ||
    !credentials.sandboxSecretKey
  ) {
    throw new CliValidationError(
      '+npm-install must run inside a Linux te-agent sandbox',
      {
        hint: 'Install and package the npm CLI in its target Linux runtime, then authenticate as root or agent_admin.',
      },
    );
  }
}

async function uploadArchive(
  ctx: RuntimeContext,
  archivePath: string,
  archiveBytes: number,
  maxArchiveBytes: number,
): Promise<unknown> {
  if (archiveBytes > maxArchiveBytes) {
    throw new CliValidationError(
      `Compressed tool package exceeds the server limit of ${maxArchiveBytes} bytes`,
    );
  }
  const archive = await readFile(archivePath);
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    path.basename(archivePath),
  );
  return uploadAdminForm(TOOL_UPLOAD_PATH, formData, ctx.host());
}

async function packageAndUpload(
  ctx: RuntimeContext,
  root: string,
  manifestPath: string | undefined,
  policy: ToolUploadPolicy,
): Promise<unknown> {
  const created = await createToolArchive(root, manifestPath);
  try {
    const result = await uploadArchive(
      ctx,
      created.archivePath,
      created.archiveBytes,
      policy.limits.maxArchiveBytes,
    );
    return {
      ...(result as Record<string, unknown>),
      package: {
        name: created.manifest.name,
        version: created.manifest.version,
        archiveBytes: created.archiveBytes,
      },
    };
  } finally {
    await removeTemporaryTree(path.dirname(created.archivePath));
  }
}

async function runNpmInstall(
  root: string,
  spec: string,
  allowScripts: boolean,
): Promise<void> {
  const args = [
    'install',
    '--prefix',
    root,
    '--omit=dev',
    '--no-audit',
    '--no-fund',
    '--save-exact',
    ...(allowScripts ? [] : ['--ignore-scripts']),
    spec,
  ];
  await new Promise<void>((resolvePromise, rejectPromise) => {
    let timedOut = false;
    const child = spawn('npm', args, {
      shell: false,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, NPM_INSTALL_TIMEOUT_MS);
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      process.stderr.write(text);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectPromise(
        new CliValidationError(`Unable to start npm: ${error.message}`),
      );
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new CliValidationError(
          timedOut
            ? `npm install timed out after ${NPM_INSTALL_TIMEOUT_MS / 60_000} minutes`
            : `npm install failed${code === null ? ` (${signal ?? 'terminated'})` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

async function readInstalledPackageJson(
  root: string,
  packageName: string,
): Promise<NpmPackageJson> {
  const packageJsonPath = path.join(
    root,
    'node_modules',
    ...packageName.split('/'),
    'package.json',
  );
  let raw: string;
  try {
    raw = await readFile(packageJsonPath, 'utf8');
  } catch {
    throw new CliValidationError(
      `npm did not install the expected package: ${packageName}`,
    );
  }
  try {
    return JSON.parse(raw) as NpmPackageJson;
  } catch {
    throw new CliValidationError(
      `Installed package.json is invalid: ${packageName}`,
    );
  }
}

async function validateCommandEntries(
  root: string,
  entries: string[],
): Promise<void> {
  for (const entry of entries) {
    const entryPath = path.join(root, ...entry.split('/'));
    let info;
    try {
      info = await stat(entryPath);
    } catch {
      throw new CliValidationError(
        `Installed npm command entry does not exist: ${entry}`,
      );
    }
    if (!info.isFile()) {
      throw new CliValidationError(
        `Installed npm command entry is not a regular file: ${entry}`,
      );
    }
  }
}

export const uploadSandboxTool: Command = {
  service: 'system',
  command: '+upload-sandbox-tool',
  description:
    'Package and upload a custom sandbox tool from a local directory',
  flags: [
    {
      name: 'path',
      type: 'string',
      required: true,
      desc: 'Tool package root; tool.json must be at this directory root unless --manifest is used',
    },
    {
      name: 'manifest',
      type: 'string',
      desc: 'Optional external tool.json path when the package root does not contain one',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    if (!ctx.str('path').trim()) {
      throw new CliValidationError('--path cannot be empty');
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: TOOL_UPLOAD_PATH,
    body: {
      path: path.resolve(ctx.str('path')),
      manifest: optionalFlag(ctx, 'manifest'),
      archiveFormat: 'zip',
      activatesTool: false,
    },
  }),
  execute: async (ctx) => {
    const policy = await requireUploadPolicy(ctx);
    return packageAndUpload(
      ctx,
      ctx.str('path'),
      optionalFlag(ctx, 'manifest'),
      policy,
    );
  },
};

export const npmInstallSandboxTool: Command = {
  service: 'system',
  command: '+npm-install',
  description:
    'Install an exact npm CLI package in the sandbox and upload it as a shared tool',
  flags: [
    {
      name: 'package',
      type: 'string',
      required: true,
      desc: 'Exact registry package version, for example eslint@9.32.0 or @scope/cli@1.2.3',
    },
    {
      name: 'name',
      type: 'string',
      desc: 'Optional shared tool identifier; defaults to the unscoped npm package name',
    },
    {
      name: 'allow-scripts',
      type: 'boolean',
      default: false,
      desc: 'Allow npm lifecycle scripts; disabled by default for supply-chain safety',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    parseExactNpmPackageSpec(ctx.str('package'));
  },
  dryRun: (ctx) => {
    const spec = parseExactNpmPackageSpec(ctx.str('package'));
    return {
      method: 'POST',
      url: TOOL_UPLOAD_PATH,
      body: {
        package: spec.spec,
        name: optionalFlag(ctx, 'name'),
        ignoreScripts: !ctx.bool('allow-scripts'),
        installLocation: 'temporary sandbox directory',
        activatesTool: false,
      },
    };
  },
  execute: async (ctx) => {
    requireLinuxSandbox();
    const spec = parseExactNpmPackageSpec(ctx.str('package'));
    const policy = await requireUploadPolicy(ctx);
    const root = await createNpmInstallRoot();
    try {
      await runNpmInstall(root, spec.spec, ctx.bool('allow-scripts'));
      const packageJson = await readInstalledPackageJson(root, spec.name);
      const manifest = manifestFromNpmPackage(
        spec,
        packageJson,
        optionalFlag(ctx, 'name'),
      );
      await validateCommandEntries(
        root,
        manifest.commands.map((command) => command.entry),
      );
      await writeGeneratedManifest(root, manifest);
      return await packageAndUpload(ctx, root, undefined, policy);
    } finally {
      await removeTemporaryTree(root);
    }
  },
};

export const listSandboxTools = createAdminCommand({
  command: '+list-sandbox-tools',
  description: 'List preset and custom sandbox tools registered for the current company',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/sandbox-tools' }),
});

export const syncSandboxTools = createAdminCommand({
  command: '+sync-sandbox-tools',
  description: 'Synchronize the current company sandbox tool registry from the system manifest',
  flags: [],
  risk: 'write',
  prepare: () => ({ method: 'POST', path: '/api/admin/sandbox-tools/sync', body: {} }),
});

export const getSandboxToolDistribution = createAdminCommand({
  command: '+get-sandbox-tool-distribution',
  description: 'Get the sandboxes to which one tool is currently distributed',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox tool ID from +list-sandbox-tools' },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: `/api/admin/sandbox-tools/${encodeId(ctx.str('id'))}/distribution`,
  }),
});

export const setSandboxToolEnabled = createAdminCommand({
  command: '+set-sandbox-tool-enabled',
  description: 'Enable or disable a sandbox tool in the company registry',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox tool ID from +list-sandbox-tools' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the sandbox tool is enabled' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/sandbox-tools/${encodeId(ctx.str('id'))}`,
    body: { enabled: ctx.bool('enabled') },
  }),
});

export const removeSandboxTool = createAdminCommand({
  command: '+remove-sandbox-tool',
  description: 'Delete a sandbox tool after the server verifies it is fully reclaimed',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox tool ID from +list-sandbox-tools' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/admin/sandbox-tools/${encodeId(ctx.str('id'))}`,
  }),
});

function createSandboxToolOperationCommand(
  command: string,
  description: string,
  route: 'activate' | 'deactivate' | 'status',
): Command {
  return createAdminCommand({
    command,
    description,
    flags: TOOL_OPERATION_FLAGS,
    risk: 'write',
    validate: (ctx) => {
      sandboxToolOperationBody(ctx);
    },
    prepare: (ctx) => ({
      method: 'POST',
      path: `/api/admin/sandbox-tools/${route}`,
      body: sandboxToolOperationBody(ctx),
    }),
  });
}

export const activateSandboxTools = createSandboxToolOperationCommand(
  '+activate-sandbox-tools',
  'Activate selected tool commands in selected or all running sandboxes',
  'activate',
);

export const deactivateSandboxTools = createSandboxToolOperationCommand(
  '+deactivate-sandbox-tools',
  'Deactivate selected managed tool commands in selected or all running sandboxes',
  'deactivate',
);

export const refreshSandboxToolStatus = createSandboxToolOperationCommand(
  '+refresh-sandbox-tool-status',
  'Refresh the observed tool state in selected or all running sandboxes',
  'status',
);

export const listSandboxToolOperations = createAdminCommand({
  command: '+list-sandbox-tool-operations',
  description: 'List sandbox tool activation and deactivation operation history',
  flags: [
    { name: 'page', type: 'number', min: 1, desc: 'Page number (default: 1)' },
    { name: 'page-size', type: 'number', min: 1, max: 100, desc: 'Page size (1-100, default: 20)' },
    { name: 'action', type: 'string', desc: `Operation action: ${OPERATION_ACTIONS.join(' | ')}` },
    { name: 'operator', type: 'string', maxLength: 100, desc: 'Operator name or ID filter' },
    { name: 'sort-order', type: 'string', desc: `Sort order: ${SORT_ORDERS.join(' | ')}` },
  ],
  risk: 'read',
  validate: (ctx) => {
    assertEnum('action', optionalString(ctx, 'action'), OPERATION_ACTIONS);
    assertEnum('sort-order', optionalString(ctx, 'sort-order'), SORT_ORDERS);
  },
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/sandbox-tools/operations', {
      page: ctx.optionalNum('page'),
      pageSize: ctx.optionalNum('page-size'),
      action: optionalString(ctx, 'action'),
      operator: optionalString(ctx, 'operator'),
      sortOrder: optionalString(ctx, 'sort-order'),
    }),
  }),
});

export const sandboxToolCommands: Command[] = [
  uploadSandboxTool,
  npmInstallSandboxTool,
  listSandboxTools,
  syncSandboxTools,
  getSandboxToolDistribution,
  setSandboxToolEnabled,
  removeSandboxTool,
  activateSandboxTools,
  deactivateSandboxTools,
  refreshSandboxToolStatus,
  listSandboxToolOperations,
];
