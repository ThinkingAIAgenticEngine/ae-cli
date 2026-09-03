import { createWriteStream } from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ZipArchive } from 'archiver';

import { CliValidationError } from '../../core/errors.js';

export const TOOL_UPLOAD_LIMITS = {
  maxArchiveBytes: 50 * 1024 * 1024,
  maxUnpackedBytes: 500 * 1024 * 1024,
  maxFileBytes: 50 * 1024 * 1024,
  maxFiles: 10_000,
} as const;

const TOOL_NAME_RE = /^[a-z][a-z0-9._-]{0,63}$/;
const EXACT_VERSION_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SAFE_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const RESERVED_COMMANDS = new Set([
  'claude',
  'node',
  'npm',
  'npx',
  'bash',
  'sh',
  'python',
  'python3',
  'pip',
  'pip3',
  'chromium',
  'git',
  'lark-cli',
  'env',
  'sudo',
  'curl',
  'wget',
]);

export interface ToolCommandManifest {
  name: string;
  entry: string;
  runtime: 'node' | 'native';
}

export interface ToolManifest {
  schemaVersion: 1;
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  commands: ToolCommandManifest[];
}

export interface ExactNpmPackageSpec {
  name: string;
  version: string;
  spec: string;
}

export interface NpmPackageJson {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  bin?: unknown;
}

export interface CreatedToolArchive {
  archivePath: string;
  manifest: ToolManifest;
  archiveBytes: number;
}

function isValidRelativePath(value: string): boolean {
  if (!value || value.length > 500) return false;
  if (/[\x00-\x1f\x7f]/.test(value) || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return false;
  if (value.endsWith('/') || value.includes('//')) return false;
  const segments = value.split('/');
  return !segments.some(
    (segment) =>
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment === 'current',
  );
}

function requirePlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliValidationError(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length > 0) {
    throw new CliValidationError(
      `${label} contains unsupported fields: ${unknown.join(', ')}`,
    );
  }
}

export function validateToolManifest(value: unknown): ToolManifest {
  const manifest = requirePlainObject(value, 'tool.json');
  rejectUnknownKeys(
    manifest,
    [
      'schemaVersion',
      'name',
      'displayName',
      'description',
      'version',
      'commands',
    ],
    'tool.json',
  );
  if (manifest.schemaVersion !== 1) {
    throw new CliValidationError('tool.json schemaVersion must be 1');
  }
  if (typeof manifest.name !== 'string' || !TOOL_NAME_RE.test(manifest.name)) {
    throw new CliValidationError(
      'tool.json name must start with a lowercase letter and contain only lowercase letters, numbers, ., _, or - (max 64)',
    );
  }
  if (
    typeof manifest.version !== 'string' ||
    !SAFE_VERSION_RE.test(manifest.version)
  ) {
    throw new CliValidationError(
      'tool.json version contains unsupported characters or is too long',
    );
  }
  if (
    manifest.displayName !== undefined &&
    (typeof manifest.displayName !== 'string' ||
      manifest.displayName.length > 200)
  ) {
    throw new CliValidationError(
      'tool.json displayName must be a string of at most 200 characters',
    );
  }
  if (
    manifest.description !== undefined &&
    (typeof manifest.description !== 'string' ||
      manifest.description.length > 2_000)
  ) {
    throw new CliValidationError(
      'tool.json description must be a string of at most 2000 characters',
    );
  }
  if (
    !Array.isArray(manifest.commands) ||
    manifest.commands.length < 1 ||
    manifest.commands.length > 64
  ) {
    throw new CliValidationError(
      'tool.json commands must contain between 1 and 64 entries',
    );
  }

  const commandNames = new Set<string>();
  const commands = manifest.commands.map(
    (rawCommand, index): ToolCommandManifest => {
      const command = requirePlainObject(
        rawCommand,
        `tool.json commands[${index}]`,
      );
      rejectUnknownKeys(
        command,
        ['name', 'entry', 'runtime'],
        `tool.json commands[${index}]`,
      );
      if (
        typeof command.name !== 'string' ||
        !TOOL_NAME_RE.test(command.name)
      ) {
        throw new CliValidationError(
          `tool.json commands[${index}].name is invalid`,
        );
      }
      if (RESERVED_COMMANDS.has(command.name)) {
        throw new CliValidationError(
          `tool.json command name is reserved: ${command.name}`,
        );
      }
      if (commandNames.has(command.name)) {
        throw new CliValidationError(
          `tool.json contains duplicate command name: ${command.name}`,
        );
      }
      commandNames.add(command.name);
      if (
        typeof command.entry !== 'string' ||
        !isValidRelativePath(command.entry)
      ) {
        throw new CliValidationError(
          `tool.json commands[${index}].entry must be a safe relative path`,
        );
      }
      if (command.runtime !== 'node' && command.runtime !== 'native') {
        throw new CliValidationError(
          `tool.json commands[${index}].runtime must be node or native`,
        );
      }
      return {
        name: command.name,
        entry: command.entry,
        runtime: command.runtime,
      };
    },
  );

  return {
    schemaVersion: 1,
    name: manifest.name,
    ...(manifest.displayName === undefined
      ? {}
      : { displayName: manifest.displayName as string }),
    ...(manifest.description === undefined
      ? {}
      : { description: manifest.description as string }),
    version: manifest.version,
    commands,
  };
}

export function parseExactNpmPackageSpec(raw: string): ExactNpmPackageSpec {
  const value = raw.trim();
  const separator = value.lastIndexOf('@');
  const name = separator > 0 ? value.slice(0, separator) : '';
  const version = separator > 0 ? value.slice(separator + 1) : '';
  if (!PACKAGE_NAME_RE.test(name) || !EXACT_VERSION_RE.test(version)) {
    throw new CliValidationError(
      '--package must be an exact registry package version, for example eslint@9.32.0 or @scope/cli@1.2.3',
      {
        hint: 'Tags, ranges, URLs, Git sources, aliases, and local paths are not allowed.',
      },
    );
  }
  return { name, version, spec: `${name}@${version}` };
}

function defaultCommandName(packageName: string): string {
  const slash = packageName.lastIndexOf('/');
  return slash >= 0 ? packageName.slice(slash + 1) : packageName;
}

function packagePath(packageName: string): string {
  return path.posix.join('node_modules', ...packageName.split('/'));
}

export function manifestFromNpmPackage(
  expected: ExactNpmPackageSpec,
  packageJson: NpmPackageJson,
  toolName?: string,
): ToolManifest {
  if (
    packageJson.name !== expected.name ||
    packageJson.version !== expected.version
  ) {
    throw new CliValidationError(
      `npm installed ${String(packageJson.name)}@${String(packageJson.version)}, expected ${expected.spec}`,
    );
  }
  const bins: Array<[string, string]> = [];
  if (typeof packageJson.bin === 'string') {
    bins.push([defaultCommandName(expected.name), packageJson.bin]);
  } else if (
    packageJson.bin &&
    typeof packageJson.bin === 'object' &&
    !Array.isArray(packageJson.bin)
  ) {
    for (const [name, entry] of Object.entries(
      packageJson.bin as Record<string, unknown>,
    )) {
      if (typeof entry !== 'string') {
        throw new CliValidationError(
          `npm package bin entry must be a string: ${name}`,
        );
      }
      bins.push([name, entry]);
    }
  }
  if (bins.length === 0) {
    throw new CliValidationError(
      `npm package ${expected.spec} does not expose a CLI through package.json bin`,
    );
  }

  const commands = bins.map(([name, entry]): ToolCommandManifest => {
    const normalizedEntry = entry.replace(/^\.\//, '');
    if (!isValidRelativePath(normalizedEntry)) {
      throw new CliValidationError(
        `npm package bin path must stay inside the package: ${name}`,
      );
    }
    const packageRoot = packagePath(expected.name);
    const commandEntry = path.posix.join(packageRoot, normalizedEntry);
    if (!commandEntry.startsWith(`${packageRoot}/`)) {
      throw new CliValidationError(
        `npm package bin path must stay inside the package: ${name}`,
      );
    }
    return {
      name,
      entry: commandEntry,
      runtime: 'node',
    };
  });
  return validateToolManifest({
    schemaVersion: 1,
    name: toolName || defaultCommandName(expected.name),
    displayName: expected.name,
    ...(typeof packageJson.description === 'string'
      ? { description: packageJson.description.slice(0, 2_000) }
      : {}),
    version: expected.version,
    commands,
  });
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function loadManifest(
  root: string,
  manifestPath?: string,
): Promise<{
  manifest: ToolManifest;
  sourcePath: string;
}> {
  const rootManifest = path.join(root, 'tool.json');
  const explicitPath = manifestPath ? path.resolve(manifestPath) : rootManifest;
  if (
    manifestPath &&
    explicitPath !== rootManifest &&
    (await pathExists(rootManifest))
  ) {
    throw new CliValidationError(
      'The upload root already contains tool.json; remove --manifest or remove the duplicate root manifest',
    );
  }
  let raw: string;
  try {
    raw = await readFile(explicitPath, 'utf8');
  } catch {
    throw new CliValidationError(
      `Unable to read tool manifest: ${explicitPath}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliValidationError('tool.json must contain valid UTF-8 JSON');
  }
  return { manifest: validateToolManifest(parsed), sourcePath: explicitPath };
}

function isNpmBinLink(relativePath: string): boolean {
  const segments = relativePath.split('/');
  return (
    segments.length >= 3 &&
    segments[segments.length - 2] === '.bin' &&
    segments[segments.length - 3] === 'node_modules'
  );
}

function ensureInsideRoot(
  rootRealPath: string,
  targetRealPath: string,
  label: string,
): void {
  const relative = path.relative(rootRealPath, targetRealPath);
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new CliValidationError(`${label} resolves outside the upload root`);
  }
}

function npmBinWrapper(
  linkRelativePath: string,
  targetRealPath: string,
  rootRealPath: string,
): string {
  const targetRelativePath = path
    .relative(
      path.dirname(path.join(rootRealPath, ...linkRelativePath.split('/'))),
      targetRealPath,
    )
    .split(path.sep)
    .join('/');
  if (!targetRelativePath || /[\r\n\x00]/.test(targetRelativePath)) {
    throw new CliValidationError(
      `Unable to materialize npm bin link: ${linkRelativePath}`,
    );
  }
  const quotedTarget = `'${targetRelativePath.replace(/'/g, `'\\''`)}'`;
  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"',
    `exec "$SCRIPT_DIR"/${quotedTarget} "$@"`,
    '',
  ].join('\n');
}

async function collectArchiveEntries(
  root: string,
  manifestSourcePath: string,
): Promise<
  Array<{
    sourcePath?: string;
    content?: string;
    archivePath: string;
    mode: number;
  }>
> {
  const rootRealPath = await realpath(root);
  const entries: Array<{
    sourcePath?: string;
    content?: string;
    archivePath: string;
    mode: number;
  }> = [];
  const npmBinTargets = new Set<string>();
  let fileCount = 0;
  let unpackedBytes = 0;

  async function walk(directory: string): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const sourcePath = path.join(directory, child.name);
      const relativePath = path
        .relative(root, sourcePath)
        .split(path.sep)
        .join('/');
      if (!isValidRelativePath(relativePath)) {
        throw new CliValidationError(
          `Upload root contains an unsafe path: ${relativePath}`,
        );
      }
      const info = await lstat(sourcePath);
      if (info.isDirectory()) {
        await walk(sourcePath);
        continue;
      }
      if (sourcePath === manifestSourcePath || relativePath === 'tool.json')
        continue;

      fileCount += 1;
      if (fileCount > TOOL_UPLOAD_LIMITS.maxFiles - 1) {
        throw new CliValidationError(
          `Upload root exceeds ${TOOL_UPLOAD_LIMITS.maxFiles} files`,
        );
      }
      if (info.isSymbolicLink()) {
        if (!isNpmBinLink(relativePath)) {
          throw new CliValidationError(
            `Symbolic links are only allowed under node_modules/.bin: ${relativePath}`,
          );
        }
        const rawTarget = await readlink(sourcePath);
        if (/[\r\n\x00]/.test(rawTarget)) {
          throw new CliValidationError(
            `npm bin link has an unsafe target: ${relativePath}`,
          );
        }
        const targetRealPath = await realpath(sourcePath);
        ensureInsideRoot(
          rootRealPath,
          targetRealPath,
          `npm bin link ${relativePath}`,
        );
        const targetInfo = await stat(targetRealPath);
        if (!targetInfo.isFile()) {
          throw new CliValidationError(
            `npm bin link must resolve to a regular file: ${relativePath}`,
          );
        }
        npmBinTargets.add(
          path.relative(rootRealPath, targetRealPath).split(path.sep).join('/'),
        );
        const content = npmBinWrapper(
          relativePath,
          targetRealPath,
          rootRealPath,
        );
        unpackedBytes += Buffer.byteLength(content);
        if (unpackedBytes > TOOL_UPLOAD_LIMITS.maxUnpackedBytes) {
          throw new CliValidationError(
            'Upload root exceeds the 500 MB unpacked size limit',
          );
        }
        entries.push({ content, archivePath: relativePath, mode: 0o755 });
        continue;
      }
      if (!info.isFile()) {
        throw new CliValidationError(
          `Upload root contains an unsupported file type: ${relativePath}`,
        );
      }
      if (info.size > TOOL_UPLOAD_LIMITS.maxFileBytes) {
        throw new CliValidationError(
          `File exceeds the 50 MB limit: ${relativePath}`,
        );
      }
      unpackedBytes += info.size;
      if (unpackedBytes > TOOL_UPLOAD_LIMITS.maxUnpackedBytes) {
        throw new CliValidationError(
          'Upload root exceeds the 500 MB unpacked size limit',
        );
      }
      entries.push({
        sourcePath,
        archivePath: relativePath,
        mode: info.mode & 0o777,
      });
    }
  }

  await walk(root);
  return entries.map((entry) =>
    npmBinTargets.has(entry.archivePath)
      ? { ...entry, mode: entry.mode | 0o111 }
      : entry,
  );
}

async function writeArchive(
  archivePath: string,
  manifest: ToolManifest,
  entries: Awaited<ReturnType<typeof collectArchiveEntries>>,
): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const output = createWriteStream(archivePath, { mode: 0o600 });
    const zip = new ZipArchive({ zlib: { level: 9 } });
    output.on('close', resolvePromise);
    output.on('error', rejectPromise);
    zip.on('error', rejectPromise);
    zip.on('warning', (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        rejectPromise(error);
    });
    zip.pipe(output);
    zip.append(`${JSON.stringify(manifest, null, 2)}\n`, {
      name: 'tool.json',
      mode: 0o644,
    });
    for (const entry of entries) {
      if (entry.sourcePath) {
        zip.file(entry.sourcePath, {
          name: entry.archivePath,
          mode: entry.mode,
        });
      } else {
        zip.append(entry.content ?? '', {
          name: entry.archivePath,
          mode: entry.mode,
        });
      }
    }
    void zip.finalize();
  });
}

export async function createToolArchive(
  rootPath: string,
  manifestPath?: string,
): Promise<CreatedToolArchive> {
  const root = path.resolve(rootPath);
  let rootInfo;
  try {
    rootInfo = await stat(root);
  } catch {
    throw new CliValidationError(`Upload root does not exist: ${root}`);
  }
  if (!rootInfo.isDirectory()) {
    throw new CliValidationError(`Upload root must be a directory: ${root}`);
  }

  const { manifest, sourcePath } = await loadManifest(root, manifestPath);
  const entries = await collectArchiveEntries(root, sourcePath);
  const entryPaths = new Set(entries.map((entry) => entry.archivePath));
  for (const command of manifest.commands) {
    if (!entryPaths.has(command.entry)) {
      throw new CliValidationError(
        `tool.json command entry does not exist in the upload root: ${command.entry}`,
      );
    }
  }
  const archiveDirectory = await mkdtemp(
    path.join(tmpdir(), 'ae-cli-sandbox-tool-'),
  );
  const archivePath = path.join(
    archiveDirectory,
    `${manifest.name}-${manifest.version}.zip`,
  );
  try {
    await writeArchive(archivePath, manifest, entries);
    const archiveInfo = await stat(archivePath);
    if (archiveInfo.size > TOOL_UPLOAD_LIMITS.maxArchiveBytes) {
      throw new CliValidationError(
        'Compressed tool package exceeds the 50 MB upload limit',
      );
    }
    return { archivePath, manifest, archiveBytes: archiveInfo.size };
  } catch (error) {
    await rm(archiveDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function createNpmInstallRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ae-cli-npm-tool-'));
  await mkdir(root, { recursive: true });
  return root;
}

export async function writeGeneratedManifest(
  root: string,
  manifest: ToolManifest,
): Promise<void> {
  await writeFile(
    path.join(root, 'tool.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    {
      mode: 0o600,
    },
  );
}

export async function removeTemporaryTree(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
