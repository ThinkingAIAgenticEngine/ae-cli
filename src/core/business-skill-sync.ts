import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { getConfigDir } from './config.js';
import { businessForSkill, getSkillBusinessState, normalizeBusinesses, OPTIONAL_BUSINESSES, type BusinessStates } from './businesses.js';
import skillBusinesses from './skill-businesses.json' with { type: 'json' };
import { readBundledSkills } from './skills-install.js';
import { createPinnedSkillsTool, skillCopyHash, skillPathIdentity, skillPathProblem, type SkillsTool, type SkillsToolOperation, type SkillsToolTarget } from './skills-tool.js';

export interface BusinessSkillContext {
  host?: string | null;
  tokenFingerprint?: string | null;
  stateDirectory?: string;
}
export interface BusinessSkillSyncOptions extends BusinessSkillContext {
  /** The complete skills directory in the installed CLI package. */
  skillsDirectory: string;
  businesses: BusinessStates;
  mode?: 'adopt' | 'sync';
  /** Reuse a complete applied selection and scan only businesses whose known state changed. */
  onlyIfChanged?: boolean;
  generation?: string;
  isCurrentContext?: () => boolean;
  packageVersion?: string;
  tool?: SkillsTool;
  env?: NodeJS.ProcessEnv;
}
export interface BusinessSkillCopyResult { skill: string; agent: string; path: string; reason?: string }
export interface BusinessSkillSyncReport {
  status: 'success' | 'partial' | 'busy' | 'stale' | 'failed';
  adopted: BusinessSkillCopyResult[];
  installed: BusinessSkillCopyResult[];
  removed: BusinessSkillCopyResult[];
  skipped: BusinessSkillCopyResult[];
  failed: BusinessSkillCopyResult[];
  managed_count: number;
}
interface ManagedCopy { skill: string; agent: string; hash: string; package_version: string }
interface AppliedBusinesses {
  host: string;
  token_fingerprint: string;
  package_version: string;
  businesses: BusinessStates;
  source_root?: string;
  policy_hash?: string;
  history_hash?: string;
}
interface Ledger { schema_version: 1; copies: Record<string, ManagedCopy>; last_applied?: AppliedBusinesses }
interface ActiveContext { host: string; token_fingerprint: string; generation: string }

const CONTEXT_FILE = 'business-skill-context.json';
const LEDGER_FILE = 'business-skills.json';
const LOCK_FILE = 'business-skills.lock';
const POLICY_HASH = createHash('sha256')
  .update(JSON.stringify({ removal_policy: 2, optional_businesses: OPTIONAL_BUSINESSES, skills: skillBusinesses })).digest('hex');

/** Historical installer provenance survives edits; its content hash is not ownership. */
function historicalCliSkills(options: BusinessSkillSyncOptions): { names: Set<string>; hash: string } {
  const env = options.env ?? process.env;
  const home = env.HOME || env.USERPROFILE || os.homedir();
  const file = env.XDG_STATE_HOME ? path.join(env.XDG_STATE_HOME, 'skills', '.skill-lock.json')
    : path.join(home, '.agents', '.skill-lock.json');
  const names = new Set<string>();
  let content = '';
  const isCliSource = (value: unknown, type: unknown): boolean => {
    if (typeof value !== 'string') return false;
    if (type === 'local' && path.isAbsolute(value)) {
      const source = path.resolve(value);
      if (source === path.resolve(options.skillsDirectory)) return true;
      if (path.basename(source) !== 'skills') return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(source, '..', 'package.json'), 'utf8'));
        return ['@tant/ae-cli', '@thinkingai/ae-cli'].includes(pkg.name) && typeof pkg.bin?.['ae-cli'] === 'string';
      } catch { return false; }
    }
    if (!['git', 'github'].includes(String(type))) return false;
    const source = value.replace(/\/+$/, '').replace(/\.git$/, '');
    return ['ThinkingAIAgenticEngine/ae-cli', 'https://github.com/ThinkingAIAgenticEngine/ae-cli',
      'git@github.com:ThinkingAIAgenticEngine/ae-cli',
      'ssh://git@gitlab.thinkingdata.cn:2222/te-ai/te-cli',
      'https://gitlab.thinkingdata.cn/te-ai/te-cli',
      'http://10.27.249.150:8888/te-ai/te-cli'].includes(source);
  };
  try {
    content = fs.readFileSync(file, 'utf8');
    const lock = JSON.parse(content);
    const mapped = new Set(Object.values(skillBusinesses).flat());
    if (typeof lock.version === 'number' && lock.skills && typeof lock.skills === 'object') {
      for (const [name, entry] of Object.entries(lock.skills)) {
        if (!mapped.has(name) || !entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        if (isCliSource(record.source, record.sourceType) || isCliSource(record.sourceUrl, record.sourceType)) names.add(name);
      }
    }
  } catch { /* Missing or malformed history cannot grant installation ownership. */ }
  return { names, hash: createHash('sha256').update(content).digest('hex') };
}

function writeJson(file: string, value: unknown): void {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    try { fs.unlinkSync(temporary); } catch {}
  }
}

function contextIdentity(options: BusinessSkillContext): Omit<ActiveContext, 'generation'> {
  const fingerprint = options.tokenFingerprint ?? '';
  if (fingerprint && !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Expected a SHA-256 token fingerprint.');
  let host = '';
  if (options.host) {
    const url = new URL(options.host);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid active host.');
    }
    host = url.href.replace(/\/+$/, '');
  }
  return { host, token_fingerprint: fingerprint };
}

/** Reserve before an asynchronous refresh so an older response cannot change the shared set. */
export function reserveBusinessSkillContext(options: BusinessSkillContext): string {
  const directory = options.stateDirectory ?? getConfigDir();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const generation = randomUUID();
  writeJson(path.join(directory, CONTEXT_FILE), { ...contextIdentity(options), generation });
  return generation;
}

function currentContext(options: BusinessSkillContext & { isCurrentContext?: () => boolean }, file: string, generation: string): boolean {
  try {
    if (options.isCurrentContext && !options.isCurrentContext()) return false;
    const active = JSON.parse(fs.readFileSync(file, 'utf8')) as ActiveContext;
    const identity = contextIdentity(options);
    return active.generation === generation && active.host === identity.host
      && active.token_fingerprint === identity.token_fingerprint;
  } catch { return false; }
}

export function isBusinessSkillContextCurrent(
  options: BusinessSkillContext & { generation: string; isCurrentContext?: () => boolean },
): boolean {
  return currentContext(options, path.join(options.stateDirectory ?? getConfigDir(), CONTEXT_FILE), options.generation);
}

function takeLock(file: string): (() => void) | null {
  const owner = randomUUID();
  const ownerName = `owner-${process.pid}-${owner}.json`;
  const candidate = fs.mkdtempSync(`${file}.candidate-`);
  const alive = (pid: number): boolean => {
    try { process.kill(pid, 0); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
  };
  try {
    fs.chmodSync(candidate, 0o700);
    fs.writeFileSync(path.join(candidate, ownerName), JSON.stringify({ pid: process.pid, owner }), { mode: 0o600 });
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // A complete nonempty directory is published atomically. It cannot replace a live lock.
        fs.renameSync(candidate, file);
        // The old protocol's reclamation file is obsolete once this directory owns the lock.
        try { fs.unlinkSync(`${file}.reclaim`); } catch {}
        return () => {
          try { fs.unlinkSync(path.join(file, ownerName)); } catch {}
          try { fs.rmdirSync(file); } catch {}
        };
      } catch (error) {
        let stat: fs.Stats;
        try { stat = fs.lstatSync(file); }
        catch (cause) {
          if ((cause as NodeJS.ErrnoException).code === 'ENOENT') continue;
          throw error;
        }
        if (stat.isSymbolicLink()) return null;
        if (stat.isFile()) {
          // Migrate old locks, including a process killed before its JSON was fully written.
          let pid: number | undefined;
          try { pid = JSON.parse(fs.readFileSync(file, 'utf8')).pid; } catch {}
          if (typeof pid === 'number' && Number.isInteger(pid) && pid > 0 && alive(pid)) return null;
          try { fs.unlinkSync(file); }
          catch (cause) {
            if (!['ENOENT', 'EISDIR', 'EPERM'].includes((cause as NodeJS.ErrnoException).code ?? '')) throw cause;
          }
          continue;
        }
        if (!stat.isDirectory()) return null;
        let names: string[];
        try { names = fs.readdirSync(file); }
        catch (cause) { if ((cause as NodeJS.ErrnoException).code === 'ENOENT') continue; throw cause; }
        // Reclaim only immutable owner names. A new owner uses another name, and its nonempty
        // directory makes rmdir fail, so competing reclaimers cannot remove the new lock.
        for (const name of names) {
          const match = /^owner-(\d+)-[a-f0-9-]{36}\.json$/.exec(name);
          if (!match || alive(Number(match[1]))) return null;
        }
        for (const name of names) {
          try { fs.unlinkSync(path.join(file, name)); }
          catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause; }
        }
        try { fs.rmdirSync(file); }
        catch (cause) {
          if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((cause as NodeJS.ErrnoException).code ?? '')) throw cause;
        }
      }
    }
    return null;
  } finally { fs.rmSync(candidate, { recursive: true, force: true }); }
}

function readLedger(file: string): Ledger {
  let value: Ledger;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')) as Ledger; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schema_version: 1, copies: {} };
    throw new Error('Managed Skill ledger is unreadable.');
  }
  if (value.schema_version !== 1 || !value.copies || typeof value.copies !== 'object' || Array.isArray(value.copies)) {
    throw new Error('Managed Skill ledger has an unsupported format.');
  }
  for (const [filePath, copy] of Object.entries(value.copies)) {
    if (!path.isAbsolute(filePath) || !copy || typeof copy.skill !== 'string'
      || typeof copy.agent !== 'string' || !/^[a-f0-9]{64}$/.test(copy.hash)
      || typeof copy.package_version !== 'string') throw new Error('Managed Skill ledger has an invalid copy.');
  }
  return value;
}

function result(skill: string, target: SkillsToolTarget, reason?: string): BusinessSkillCopyResult {
  return { skill, agent: target.agent, path: path.join(target.directory, skill), ...(reason ? { reason } : {}) };
}

function directInstallerLink(file: string, target: string, text: string): boolean {
  if (typeof text !== 'string') return false;
  let value = text;
  if (process.platform === 'win32') {
    if (value.toUpperCase().startsWith('\\\\?\\UNC\\')) value = '\\\\' + value.slice(8);
    else if (value.startsWith('\\\\?\\') || value.startsWith('\\??\\')) value = value.slice(4);
    return [target, path.relative(path.dirname(file), target)].some(expected => value.toLowerCase() === expected.toLowerCase());
  }
  return value === target || value === path.relative(path.dirname(file), target);
}

function legacySkillLink(file: string, skill: string, sourceRoot: string, sourceHash: string,
  targets: SkillsToolTarget[], ledger: Ledger, removing = false): SkillsToolOperation['legacy_link'] | undefined {
  const canonical = targets.find(target => target.agent === 'universal');
  if (!canonical) return;
  const target = path.join(canonical.directory, skill);
  const managed = ledger.copies[target];
  if (!managed || managed.skill !== skill || managed.agent !== canonical.agent
    || (!removing && managed.hash !== sourceHash)
    || skillPathProblem(canonical.directory, skill, sourceRoot)) return;
  try {
    if (!fs.lstatSync(file).isSymbolicLink()) return;
    const text = fs.readlinkSync(file);
    if (!directInstallerLink(file, target, text)) return;
    if (!removing && (skillCopyHash(target) !== sourceHash || fs.realpathSync(file) !== fs.realpathSync(target))) return;
    return { target, text };
  } catch { return; }
}

/** Installation ownership persists after edits; false removes owned mapped copies. */
export function syncBusinessSkills(options: BusinessSkillSyncOptions): BusinessSkillSyncReport {
  const report: BusinessSkillSyncReport = { status: 'failed', adopted: [], installed: [], removed: [],
    skipped: [], failed: [], managed_count: 0 };
  const directory = options.stateDirectory ?? getConfigDir();
  const contextFile = path.join(directory, CONTEXT_FILE);
  let unlock: (() => void) | null = null;
  try {
    if (options.isCurrentContext && !options.isCurrentContext()) { report.status = 'stale'; return report; }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const generation = options.generation ?? reserveBusinessSkillContext(options);
    if (!currentContext(options, contextFile, generation)) { report.status = 'stale'; return report; }
    unlock = takeLock(path.join(directory, LOCK_FILE));
    if (!unlock) { report.status = 'busy'; return report; }
    if (!currentContext(options, contextFile, generation)) { report.status = 'stale'; return report; }
    const ledgerFile = path.join(directory, LEDGER_FILE);
    const ledger = readLedger(ledgerFile);
    const packageVersion = options.packageVersion ?? 'unknown';
    const history = historicalCliSkills(options);
    const applied: AppliedBusinesses = { ...contextIdentity(options), package_version: packageVersion,
      businesses: normalizeBusinesses(options.businesses), source_root: fs.realpathSync(options.skillsDirectory),
      policy_hash: POLICY_HASH, history_hash: history.hash };
    let select: ((name: string) => boolean) | undefined;
    if (options.mode !== 'adopt') {
      const previous = ledger.last_applied;
      if (options.onlyIfChanged && previous && previous.package_version === packageVersion
        && previous.source_root === applied.source_root && previous.policy_hash === applied.policy_hash
        && previous.history_hash === applied.history_hash) {
        const previousStates = normalizeBusinesses(previous.businesses);
        // Unknown states preserve the current copies rather than restoring or removing them.
        const changed = new Set(OPTIONAL_BUSINESSES.filter(business =>
          previousStates[business] !== applied.businesses[business] && applied.businesses[business] !== undefined));
        if (!changed.size) {
          if (!currentContext(options, contextFile, generation)) { report.status = 'stale'; return report; }
          // Config and authorization belong to the new identity; only the static selection is reused.
          if (JSON.stringify(previous) !== JSON.stringify(applied)) {
            ledger.last_applied = applied;
            writeJson(ledgerFile, ledger);
          }
          report.managed_count = Object.keys(ledger.copies).length;
          report.status = 'success';
          return report;
        }
        select = name => {
          const business = businessForSkill(name);
          return business !== undefined && changed.has(business);
        };
      }
      // An interrupted or partial transition must also retry if config later returns to the old state.
      if (ledger.last_applied) {
        delete ledger.last_applied;
        writeJson(ledgerFile, ledger);
      }
    }
    const bundled = readBundledSkills(options.skillsDirectory, select);
    const skills = new Set(bundled.map(skill => skill.name));
    if (options.mode !== 'adopt') {
      for (const name of [...history.names, ...Object.values(ledger.copies).map(copy => copy.skill)]) {
        if (businessForSkill(name) && getSkillBusinessState(name, options.businesses) === false
          && (!select || select(name))) skills.add(name);
      }
    }
    const tool = options.tool ?? createPinnedSkillsTool({ env: options.env });
    const targets = [...tool.targets()].sort((a, b) => Number(b.agent === 'universal') - Number(a.agent === 'universal'));
    const operations: SkillsToolOperation[] = [];
    for (const name of skills) {
      const state = getSkillBusinessState(name, options.businesses);
      if (options.mode !== 'adopt' && state === undefined) continue;
      const source = path.join(options.skillsDirectory, name);
      const sourceHash = bundled.some(skill => skill.name === name) ? skillCopyHash(source, true) : null;
      if (!sourceHash && options.mode === 'adopt') throw new Error('Complete package Skill source is missing.');
      for (const target of targets) {
        const item = result(name, target);
        const pathProblem = skillPathProblem(target.directory, name, options.skillsDirectory);
        if (pathProblem) { report.skipped.push({ ...item, reason: pathProblem }); continue; }
        const managed = ledger.copies[item.path];
        if (options.mode !== 'adopt' && state === false) {
          let node: ReturnType<typeof skillPathIdentity>;
          try { node = skillPathIdentity(item.path); }
          catch { report.skipped.push({ ...item, reason: 'copy_unreadable_or_linked' }); continue; }
          if (!node) { if (managed) delete ledger.copies[item.path]; continue; }
          const legacyLink = node.type === 'symlink'
            ? legacySkillLink(item.path, name, options.skillsDirectory, sourceHash ?? '', targets, ledger, true) : undefined;
          const canonical = targets.find(copy => copy.agent === 'universal');
          const historicalLink = node.type === 'symlink' && canonical
            && directInstallerLink(item.path, path.join(canonical.directory, name), node.link!);
          // The upstream name-level lock proves the shared installation and its installer
          // links, not an independent same-name copy in every client directory.
          const historicalCopy = history.names.has(name)
            && ((target.agent === 'universal' && node.type !== 'symlink') || historicalLink);
          if (!managed && (legacyLink || historicalCopy)) {
            // Unknown historical baselines must not authorize overwriting edits when re-enabled.
            ledger.copies[item.path] = { skill: name, agent: target.agent,
              hash: sourceHash ?? '0'.repeat(64), package_version: packageVersion };
            report.adopted.push(item);
          }
          const owned = ledger.copies[item.path];
          if (!owned || owned.skill !== name || owned.agent !== target.agent) {
            report.skipped.push({ ...item, reason: node.type === 'symlink' ? 'copy_unreadable_or_linked' : 'copy_not_managed' });
            continue;
          }
          operations.push({ action: 'remove', skill: name, source, source_root: options.skillsDirectory,
            expected_hash: null, source_hash: sourceHash ?? '', target, expected_node: node,
            ...(legacyLink ? { legacy_link: legacyLink } : {}) });
          continue;
        }
        let actualHash: string | null;
        let legacyLink: SkillsToolOperation['legacy_link'];
        try { actualHash = skillCopyHash(item.path); }
        catch {
          if (options.mode !== 'adopt') legacyLink = legacySkillLink(item.path, name,
            options.skillsDirectory, sourceHash!, targets, ledger);
          if (!legacyLink) { report.skipped.push({ ...item, reason: 'copy_unreadable_or_linked' }); continue; }
          actualHash = sourceHash;
        }
        if (options.mode === 'adopt') {
          if (actualHash === null) {
            if (managed) delete ledger.copies[item.path];
            continue;
          }
          if (actualHash !== sourceHash) {
            report.skipped.push({ ...item, reason: 'copy_does_not_match_package' });
            continue;
          }
          ledger.copies[item.path] = { skill: name, agent: target.agent, hash: actualHash, package_version: packageVersion };
          report.adopted.push(item);
          continue;
        }
        if (!legacyLink && actualHash !== null && (!managed || managed.skill !== name || actualHash !== managed.hash)) {
          report.skipped.push({ ...item, reason: managed ? 'copy_modified' : 'copy_not_managed' });
          continue;
        }
        if (actualHash === sourceHash && !legacyLink) continue;
        if (actualHash === null && !target.installable) {
          if (managed) delete ledger.copies[item.path];
          continue;
        }
        if (actualHash === null && !target.detected && !managed && !fs.existsSync(target.directory)) continue;
        operations.push({ action: 'install', skill: name, source, source_root: options.skillsDirectory,
          target, expected_hash: actualHash, source_hash: sourceHash!, ...(legacyLink ? { legacy_link: legacyLink } : {}) });
      }
    }
    if (!currentContext(options, contextFile, generation)) { report.status = 'stale'; return report; }
    // Persist adoption before later calls can apply a changed business snapshot.
    if (options.mode === 'adopt') {
      writeJson(ledgerFile, ledger);
    } else if (operations.length) {
      // Remove or materialize verified installer links before changing their canonical copy.
      operations.sort((a, b) => Number(Boolean(b.legacy_link || b.expected_node?.type === 'symlink'))
        - Number(Boolean(a.legacy_link || a.expected_node?.type === 'symlink')));
      // The worker verifies exact ownership, including newly recovered historical paths.
      writeJson(ledgerFile, ledger);
      const receipts = tool.apply(operations, { file: contextFile, generation, ledger_file: ledgerFile });
      if (receipts.length !== operations.length) throw new Error('Skills adapter returned incomplete receipts.');
      for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        const receipt = receipts[index];
        const item = result(operation.skill, operation.target, receipt.reason);
        if (receipt.path !== item.path || receipt.agent !== item.agent || receipt.skill !== item.skill
          || receipt.action !== operation.action) throw new Error('Skills adapter returned mismatched receipts.');
        if (receipt.status === 'skipped') report.skipped.push(item);
        else if (receipt.status !== 'success') report.failed.push(item);
        else if (operation.action === 'remove') {
          if (skillPathIdentity(item.path) !== null) { report.failed.push({ ...item, reason: 'removal_not_verified' }); continue; }
          delete ledger.copies[item.path];
          report.removed.push(item);
        } else {
          const actualHash = skillCopyHash(item.path);
          if (actualHash !== operation.source_hash || receipt.hash !== actualHash) {
            report.failed.push({ ...item, reason: 'installation_not_verified' });
            continue;
          }
          ledger.copies[item.path] = { skill: operation.skill, agent: operation.target.agent, hash: actualHash, package_version: packageVersion };
          report.installed.push(item);
        }
      }
      // Completed receipts remain owned even if a newer context stopped later operations.
      writeJson(ledgerFile, ledger);
    } else writeJson(ledgerFile, ledger);
    report.managed_count = Object.keys(ledger.copies).length;
    report.status = !currentContext(options, contextFile, generation) ? 'stale'
      : report.skipped.length || report.failed.length ? 'partial' : 'success';
    if (options.mode !== 'adopt' && report.status === 'success') {
      ledger.last_applied = applied;
      writeJson(ledgerFile, ledger);
    }
    return report;
  } catch {
    report.status = report.installed.length || report.removed.length || report.adopted.length ? 'partial' : 'failed';
    return report;
  } finally { unlock?.(); }
}
