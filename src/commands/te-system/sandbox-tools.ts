import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { tryLoadTeAgentSandboxCredentials } from '../../core/te-agent-credentials.js';
import { getAdmin, uploadAdminForm } from './shared.js';
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

export const sandboxToolCommands: Command[] = [
  uploadSandboxTool,
  npmInstallSandboxTool,
];
