import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire, isBuiltin } from 'node:module';
import { pathToFileURL } from 'node:url';
import spawn from 'cross-spawn';

export const MANAGED_SKILLS_TOOL_VERSION = '1.5.12';
const TOOL_SOURCE_SHA256 = '5a2c18ddd70886d5367e39a0f88827ffd1024420e4d9db08149742386c088d2d';

export interface SkillsToolTarget {
  agent: string;
  directory: string;
  detected: boolean;
  /** False for registry compatibility paths that may only contain existing copies. */
  installable: boolean;
}
export interface SkillsToolOperation {
  action: 'install' | 'remove';
  skill: string;
  target: SkillsToolTarget;
  source: string;
  source_root: string;
  expected_hash: string | null;
  source_hash: string;
  /** A legacy installer link proven to reference a pristine managed canonical copy. */
  legacy_link?: { target: string; text: string };
}
export interface SkillsToolReceipt {
  action: 'install' | 'remove';
  skill: string;
  agent: string;
  path: string;
  status: 'success' | 'skipped' | 'failed';
  hash?: string;
  reason?: string;
}
export interface SkillsToolGuard { file: string; generation: string; ledger_file?: string }
export interface SkillsTool {
  targets(): SkillsToolTarget[];
  apply(operations: SkillsToolOperation[], guard: SkillsToolGuard): SkillsToolReceipt[];
}

/** Resolve missing children through the nearest existing ancestor as well. */
function realSkillPath(file: string): string {
  try { return fs.realpathSync(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const parent = path.dirname(file);
    if (parent === file) throw error;
    return path.join(realSkillPath(parent), path.basename(file));
  }
}

/** Global registrations must never grant ownership of linked directories or package sources. */
export function skillPathProblem(targetDirectory: string, skill: string, sourceRoot: string): string | null {
  try {
    const target = realSkillPath(path.resolve(targetDirectory, skill));
    const source = fs.realpathSync(sourceRoot);
    const overlaps = (a: string, b: string): boolean => a === b || a.startsWith(b + path.sep);
    if (overlaps(target, source) || overlaps(source, target)) return 'package_source_overlap';
    let parent = path.resolve(targetDirectory);
    while (true) {
      try { if (fs.lstatSync(parent).isSymbolicLink()) return 'copy_parent_linked'; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      const next = path.dirname(parent);
      if (next === parent) return null;
      parent = next;
    }
  } catch { return 'copy_parent_unreadable'; }
}

/** Includes extra files and empty directories. Links are never adopted as managed copies. */
export function skillCopyHash(directory: string, source = false): string | null {
  try {
    if (!fs.lstatSync(directory).isDirectory()) throw new Error('Not a regular Skill directory.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const hash = createHash('sha256');
  const visit = (relative: string): void => {
    for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
      if (name === '.DS_Store') continue;
      const child = path.join(relative, name);
      const absolute = path.join(directory, child);
      const stat = fs.lstatSync(absolute);
      if (source && (name === 'metadata.json' || (stat.isDirectory()
        && ['.git', '__pycache__', '__pypackages__'].includes(name)))) continue;
      const normalized = child.split(path.sep).join('/');
      if (stat.isSymbolicLink()) throw new Error('Symbolic links are not managed Skill copies.');
      if (stat.isDirectory()) {
        hash.update(`directory:${normalized}\0`);
        visit(child);
      } else if (stat.isFile()) {
        hash.update(`file:${normalized}\0${stat.size}\0`);
        hash.update(fs.readFileSync(absolute));
      } else throw new Error('Unsupported Skill file type.');
    }
  };
  visit('');
  return hash.digest('hex');
}

function replaceOnce(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw new Error('Pinned Skills adapter no longer matches its upstream source.');
  return source.replace(before, after);
}

/** Restricts the pinned tool's own removal implementation to one verified copy at a time. */
function adaptedToolSource(source: string, entry: string): string {
  const removeStart = source.indexOf('async function removeCommand(skillNames, options) {');
  const removeEnd = source.indexOf('\nfunction parseRemoveOptions(args)', removeStart);
  if (removeStart < 0 || removeEnd < 0) throw new Error('Pinned Skills removal implementation is missing.');
  let remove = source.slice(removeStart, removeEnd);
  remove = replaceOnce(remove, 'const agentResult = await detectAgent();', 'const agentResult = { isAgent: false };');
  remove = replaceOnce(remove, 'const spinner = Y();', 'const spinner = { start() {}, stop() {} };');
  remove = replaceOnce(remove, 'if (pathToCleanup === canonicalPath) continue;',
    'if (pathToCleanup === canonicalPath || !options.__aeCliAllowedPaths.has(pathToCleanup)) continue;');
  remove = replaceOnce(remove, 'if (await lstat(pathToCleanup).catch(() => null)) await rm(pathToCleanup, {',
    'if (await lstat(pathToCleanup).catch(() => null) && await options.__aeCliBeforeMutation(pathToCleanup)) await rm(pathToCleanup, {');
  remove = replaceOnce(remove, 'if (!isStillUsed) await rm(canonicalPath, {',
    'if (options.__aeCliAllowedPaths.has(canonicalPath) && await options.__aeCliBeforeMutation(canonicalPath)) await rm(canonicalPath, {');
  remove = replaceOnce(remove, 'if (isGlobal) await removeSkillFromLock(skillName);',
    'if (isGlobal && options.__aeCliRemoveLockEntry) await removeSkillFromLock(skillName);');
  remove = remove.replace(/\bM\.(?:info|warn|error|message|success)\(/g, '__aeCliQuiet(')
    .replace(/\bconsole\.log\(/g, '__aeCliQuiet(').replace(/\bSe\(/g, '__aeCliQuiet(');
  source = source.slice(0, removeStart) + remove + source.slice(removeEnd);
  source = replaceOnce(source, 'function getAgentBaseDir(agentType, global, cwd) {',
    'function getAgentBaseDir(agentType, global, cwd) {\n if (global && __aeCliTargetOverride?.agent === agentType) return __aeCliTargetOverride.directory;');
  source = replaceOnce(source, 'async function cleanAndCreateDirectory(path) {',
    'async function cleanAndCreateDirectory(path) {\n if (__aeCliBeforeInstallMutation && !await __aeCliBeforeInstallMutation(path)) throw new Error("Skill copy changed before installation.");');
  source = replaceOnce(source, 'main().finally(() => flushTelemetry().then(() => process.exit(0)));', '');
  const require = createRequire(entry);
  const resolveImport = (specifier: string): string => isBuiltin(specifier) ? specifier
    : pathToFileURL(specifier.startsWith('.') ? path.resolve(path.dirname(entry), specifier) : require.resolve(specifier)).href;
  source = source.replace(/\bfrom (['"])([^'"]+)\1/g,
    (_match, quote: string, specifier: string) => `from ${quote}${resolveImport(specifier)}${quote}`);
  source = source.replace(/\bimport (['"])([^'"]+)\1/g,
    (_match, quote: string, specifier: string) => `import ${quote}${resolveImport(specifier)}${quote}`);
  return source + WORKER_SOURCE;
}

// The worker uses the upstream registry, installer and remover. It never resolves client paths itself.
const WORKER_SOURCE = String.raw`
import * as __aeCliFs from 'node:fs';
import * as __aeCliPath from 'node:path';
const __aeCliQuiet = () => {};
let __aeCliTargetOverride = null;
let __aeCliBeforeInstallMutation = null;
function __aeCliRealPath(file) {
  try { return __aeCliFs.realpathSync(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = dirname(file);
    if (parent === file) throw error;
    return join(__aeCliRealPath(parent), basename(file));
  }
}
function __aeCliPathProblem(targetDirectory, skill, sourceRoot) {
  try {
    const target = __aeCliRealPath(resolve(targetDirectory, skill));
    const source = __aeCliFs.realpathSync(sourceRoot);
    const overlaps = (a, b) => a === b || a.startsWith(b + sep);
    if (overlaps(target, source) || overlaps(source, target)) return 'package_source_overlap';
    let parent = resolve(targetDirectory);
    while (true) {
      try { if (__aeCliFs.lstatSync(parent).isSymbolicLink()) return 'copy_parent_linked'; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const next = dirname(parent);
      if (next === parent) return null;
      parent = next;
    }
  } catch { return 'copy_parent_unreadable'; }
}
function __aeCliHash(directory, source = false) {
  try { if (!__aeCliFs.lstatSync(directory).isDirectory()) throw new Error('Unsupported Skill directory.'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const hash = createHash('sha256');
  function visit(relativePath) {
    for (const name of __aeCliFs.readdirSync(join(directory, relativePath)).sort()) {
      if (name === '.DS_Store') continue;
      const child = join(relativePath, name), absolute = join(directory, child);
      const info = __aeCliFs.lstatSync(absolute);
      if (source && (name === 'metadata.json' || (info.isDirectory() && ['.git', '__pycache__', '__pypackages__'].includes(name)))) continue;
      const normalized = child.split(sep).join('/');
      if (info.isSymbolicLink()) throw new Error('Symbolic links are not managed Skill copies.');
      if (info.isDirectory()) { hash.update('directory:' + normalized + '\0'); visit(child); }
      else if (info.isFile()) { hash.update('file:' + normalized + '\0' + info.size + '\0'); hash.update(__aeCliFs.readFileSync(absolute)); }
      else throw new Error('Unsupported Skill file type.');
    }
  }
  visit('');
  return hash.digest('hex');
}
function __aeCliLegacyLinkProblem(operation, targetPath, targets, guard) {
  try {
    const canonical = resolve(getCanonicalSkillsDir(true));
    const canonicalTarget = targets.find(target => target.agent === 'universal' && target.directory === canonical);
    const link = operation.legacy_link;
    if (!canonicalTarget || link.target !== join(canonical, operation.skill) || targetPath === link.target
      || !guard.ledger_file || operation.expected_hash !== operation.source_hash) return 'legacy_link_not_managed';
    const pathProblem = __aeCliPathProblem(canonical, operation.skill, operation.source_root);
    if (pathProblem) return pathProblem;
    const ledger = JSON.parse(__aeCliFs.readFileSync(guard.ledger_file, 'utf8'));
    const owned = ledger.schema_version === 1 && ledger.copies?.[link.target];
    if (!owned || owned.skill !== operation.skill || owned.agent !== canonicalTarget.agent
      || owned.hash !== operation.source_hash) return 'legacy_link_not_managed';
    if (!__aeCliFs.lstatSync(targetPath).isSymbolicLink() || __aeCliFs.readlinkSync(targetPath) !== link.text
      || resolve(dirname(targetPath), link.text) !== link.target
      || __aeCliFs.realpathSync(targetPath) !== __aeCliFs.realpathSync(link.target)) return 'legacy_link_changed';
    if (__aeCliHash(link.target) !== operation.source_hash) return 'legacy_link_target_modified';
    return null;
  } catch { return 'legacy_link_unreadable'; }
}
function __aeCliLinkDependsOn(file, dependency) {
  const absolute = resolve(file);
  let cursor = __aeCliPath.parse(absolute).root;
  const pending = absolute.slice(cursor.length).split(sep);
  let links = 0;
  while (pending.length) {
    const part = pending.shift();
    if (!part || part === '.') continue;
    if (part === '..') { cursor = dirname(cursor); continue; }
    cursor = join(cursor, part);
    if (cursor === dependency || cursor.startsWith(dependency + sep)) return true;
    if (!__aeCliFs.lstatSync(cursor).isSymbolicLink()) continue;
    if (++links > 64) throw new Error('Skill link chain is too deep.');
    const text = __aeCliFs.readlinkSync(cursor);
    const root = __aeCliPath.parse(text).root;
    cursor = root || dirname(cursor);
    // Expand a link before applying subsequent '..' components, matching filesystem lookup.
    pending.unshift(...text.slice(root.length).split(sep));
  }
  return false;
}
async function __aeCliTargets() {
  const detected = new Set(await detectInstalledAgents());
  const targets = new Map();
  // Prefer the canonical registry entry when several agents share its global directory.
  // Keep raw registry paths for legacy migration, but create copies only at installer destinations.
  const entries = Object.entries(agents).sort(([a], [b]) => a === 'universal' ? -1 : b === 'universal' ? 1 : a.localeCompare(b));
  for (const [agent, config] of entries) {
    if (config.globalSkillsDir === undefined) continue;
    const installDirectory = resolve(getAgentBaseDir(agent, true));
    for (const directory of new Set([installDirectory, config.globalSkillsDir])) {
      const key = __aeCliRealPath(resolve(directory));
      const installable = resolve(directory) === installDirectory;
      const target = targets.get(key);
      if (target) { target.detected ||= detected.has(agent); target.installable ||= installable; }
      else targets.set(key, { agent, directory: resolve(directory), installable,
        detected: detected.has(agent) || key === __aeCliRealPath(resolve(getCanonicalSkillsDir(true))) });
    }
  }
  return Array.from(targets.values());
}
async function __aeCliMain() {
  // spawnSync pipes may be nonblocking; a full synchronization can exceed their buffer.
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const request = JSON.parse(input);
  const targets = await __aeCliTargets();
  if (request.action === 'targets') return targets;
  const receipts = [];
  for (const operation of request.operations) {
    const target = targets.find(item => item.agent === operation.target.agent && item.directory === operation.target.directory);
    if (!target || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(operation.skill)) throw new Error('Invalid Skills operation target.');
    const targetPath = join(target.directory, operation.skill);
    const receipt = { action: operation.action, skill: operation.skill, agent: target.agent, path: targetPath, status: 'failed' };
    let blockedReason = null;
    const beforeMutation = async (candidate) => {
      try {
        const active = JSON.parse(__aeCliFs.readFileSync(request.guard.file, 'utf8'));
        if (active.generation !== request.guard.generation) { blockedReason = 'context_changed'; return false; }
        const pathProblem = __aeCliPathProblem(target.directory, operation.skill, operation.source_root);
        if (pathProblem) { blockedReason = pathProblem; return false; }
        // Registry compatibility paths remain available for existing copies only.
        if (operation.action === 'install' && operation.expected_hash === null && !target.installable) {
          blockedReason = 'legacy_target_missing'; return false;
        }
        if (candidate !== targetPath) { blockedReason = 'copy_changed'; return false; }
        if (__aeCliHash(operation.source, true) !== operation.source_hash) { blockedReason = 'package_changed'; return false; }
        if (operation.legacy_link) {
          const problem = __aeCliLegacyLinkProblem(operation, targetPath, targets, request.guard);
          if (problem) { blockedReason = problem; return false; }
        } else if (__aeCliHash(targetPath) !== operation.expected_hash) { blockedReason = 'copy_changed'; return false; }
        if (operation.action === 'remove') for (const other of targets) {
          try {
            // Preserve custom aliases too; only exact same-name installer links are migrated.
            for (const name of __aeCliFs.readdirSync(other.directory)) {
              const otherPath = join(other.directory, name);
              if (otherPath === targetPath) continue;
              try {
                if (__aeCliFs.lstatSync(otherPath).isSymbolicLink() && __aeCliLinkDependsOn(otherPath, targetPath)) {
                  blockedReason = 'dependent_unmanaged_link'; return false;
                }
              } catch (error) { if (error.code !== 'ENOENT') throw error; }
            }
          } catch (error) { if (error.code !== 'ENOENT') { blockedReason = 'dependent_copy_unreadable'; return false; } }
        }
        return true;
      } catch { blockedReason = 'copy_unreadable'; return false; }
    };
    try {
      if (!await beforeMutation(targetPath)) {
        receipt.status = 'skipped'; receipt.reason = blockedReason;
      } else {
        __aeCliTargetOverride = target;
        if (operation.action === 'install') {
          const skill = await parseSkillMd(join(operation.source, 'SKILL.md'), { includeInternal: true });
          if (!skill || skill.name !== operation.skill) throw new Error('Invalid package Skill.');
          if (!await beforeMutation(targetPath)) { receipt.status = 'skipped'; receipt.reason = blockedReason; }
          else {
            __aeCliBeforeInstallMutation = beforeMutation;
            const result = await installSkillForAgent(skill, target.agent, { global: true, mode: 'copy' });
            if (blockedReason) { receipt.status = 'skipped'; receipt.reason = blockedReason; }
            else {
              const actualHash = __aeCliHash(targetPath);
              if (!result.success || actualHash !== operation.source_hash) throw new Error('Skills installation verification failed.');
              receipt.status = 'success'; receipt.hash = actualHash;
            }
          }
        } else {
          await removeCommand([operation.skill], { global: true, yes: true, agent: [target.agent],
            __aeCliAllowedPaths: new Set([targetPath]), __aeCliBeforeMutation: beforeMutation });
          if (blockedReason) { receipt.status = 'skipped'; receipt.reason = blockedReason; }
          else {
            let exists = true;
            try { __aeCliFs.lstatSync(targetPath); }
            catch (error) { if (error.code !== 'ENOENT') throw error; exists = false; }
            if (exists) throw new Error('Skills removal verification failed.');
            receipt.status = 'success';
          }
        }
      }
    } catch { receipt.status = blockedReason ? 'skipped' : 'failed'; receipt.reason = blockedReason || 'tool_operation_failed'; }
    finally { __aeCliTargetOverride = null; __aeCliBeforeInstallMutation = null; }
    if (receipt.status === 'success' && operation.legacy_link) receipt.reason = operation.action === 'install'
      ? 'legacy_link_materialized' : 'legacy_link_removed';
    receipts.push(receipt);
  }
  return receipts;
}
try { process.stdout.write(JSON.stringify({ ok: true, data: await __aeCliMain() })); }
catch { process.stdout.write(JSON.stringify({ ok: false })); process.exitCode = 1; }
`;

export interface PinnedSkillsToolOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  timeoutMs?: number;
  entry?: string;
}

/** Runs the private adapter in a child process, keeping upstream logs out of CLI stdout. */
export function createPinnedSkillsTool(options: PinnedSkillsToolOptions = {}): SkillsTool {
  const require = createRequire(import.meta.url);
  const packageFile = options.entry ? path.join(path.dirname(options.entry), '..', 'package.json') : require.resolve('skills/package.json');
  const entry = options.entry ?? path.join(path.dirname(packageFile), 'dist', 'cli.mjs');
  const metadata = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const source = fs.readFileSync(entry, 'utf8');
  if (metadata.version !== MANAGED_SKILLS_TOOL_VERSION
    || createHash('sha256').update(source).digest('hex') !== TOOL_SOURCE_SHA256) {
    throw new Error('Managed Skill synchronization requires the verified skills@1.5.12 package.');
  }
  const script = adaptedToolSource(source, entry);
  const run = <T>(request: object): T => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-skills-tool-'));
    const worker = path.join(directory, 'adapter.mjs');
    try {
      fs.writeFileSync(worker, script, { mode: 0o600 });
      const result = spawn.sync(process.execPath, [worker], {
        input: JSON.stringify(request), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
        timeout: options.timeoutMs ?? 120_000, windowsHide: true,
        cwd: options.cwd ?? directory,
        env: { ...process.env, ...options.env, DISABLE_TELEMETRY: '1', NO_COLOR: '1', AI_AGENT: 'ae-cli' },
      });
      if (result.error || result.signal || result.status !== 0) throw new Error('Skills adapter process failed.');
      const response = JSON.parse(result.stdout);
      if (response.ok !== true) throw new Error('Skills adapter returned an invalid response.');
      return response.data as T;
    } catch {
      throw new Error('Skills adapter failed. Check the pinned package and directory permissions.');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
  return {
    targets: () => run<SkillsToolTarget[]>({ action: 'targets' }),
    apply: (operations, guard) => run<SkillsToolReceipt[]>({ action: 'apply', operations, guard }),
  };
}
