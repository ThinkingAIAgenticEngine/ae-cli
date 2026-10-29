import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getConfigDir } from './config.js';
import { getSkillBusinessState, type BusinessStates } from './businesses.js';
import { readBundledSkills } from './skills-install.js';
import { createPinnedSkillsTool, skillCopyHash, skillPathProblem, type SkillsTool, type SkillsToolOperation, type SkillsToolTarget } from './skills-tool.js';

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
interface Ledger { schema_version: 1; copies: Record<string, ManagedCopy> }
interface ActiveContext { host: string; token_fingerprint: string; generation: string }

const CONTEXT_FILE = 'business-skill-context.json';
const LEDGER_FILE = 'business-skills.json';
const LOCK_FILE = 'business-skills.lock';

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

function legacySkillLink(file: string, skill: string, sourceRoot: string, sourceHash: string,
  targets: SkillsToolTarget[], ledger: Ledger): SkillsToolOperation['legacy_link'] | undefined {
  const canonical = targets.find(target => target.agent === 'universal');
  if (!canonical) return;
  const target = path.join(canonical.directory, skill);
  const managed = ledger.copies[target];
  if (!managed || managed.skill !== skill || managed.agent !== canonical.agent || managed.hash !== sourceHash
    || skillPathProblem(canonical.directory, skill, sourceRoot)) return;
  try {
    if (!fs.lstatSync(file).isSymbolicLink() || skillCopyHash(target) !== sourceHash) return;
    const text = fs.readlinkSync(file);
    if (path.resolve(path.dirname(file), text) !== target || fs.realpathSync(file) !== fs.realpathSync(target)) return;
    return { target, text };
  } catch { return; }
}

/** Owns only matching copies adopted after CLI installation or installed by this synchronizer. */
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
    const tool = options.tool ?? createPinnedSkillsTool({ env: options.env });
    const targets = tool.targets();
    const skills = readBundledSkills(options.skillsDirectory);
    const packageVersion = options.packageVersion ?? 'unknown';
    const operations: SkillsToolOperation[] = [];
    for (const skill of skills) {
      const source = path.join(options.skillsDirectory, skill.name);
      const sourceHash = skillCopyHash(source, true);
      if (!sourceHash) throw new Error('Complete package Skill source is missing.');
      const state = getSkillBusinessState(skill.name, options.businesses);
      if (options.mode !== 'adopt' && state === undefined) continue;
      for (const target of targets) {
        const item = result(skill.name, target);
        const pathProblem = skillPathProblem(target.directory, skill.name, options.skillsDirectory);
        if (pathProblem) { report.skipped.push({ ...item, reason: pathProblem }); continue; }
        let actualHash: string | null;
        let legacyLink: SkillsToolOperation['legacy_link'];
        try { actualHash = skillCopyHash(item.path); }
        catch {
          if (options.mode !== 'adopt') legacyLink = legacySkillLink(item.path, skill.name,
            options.skillsDirectory, sourceHash, targets, ledger);
          if (!legacyLink) { report.skipped.push({ ...item, reason: 'copy_unreadable_or_linked' }); continue; }
          actualHash = sourceHash;
        }
        const managed = ledger.copies[item.path];
        if (options.mode === 'adopt') {
          if (actualHash === null) {
            if (managed) delete ledger.copies[item.path];
            continue;
          }
          if (actualHash !== sourceHash) {
            report.skipped.push({ ...item, reason: 'copy_does_not_match_package' });
            continue;
          }
          ledger.copies[item.path] = { skill: skill.name, agent: target.agent, hash: actualHash, package_version: packageVersion };
          report.adopted.push(item);
          continue;
        }
        if (!legacyLink && actualHash !== null && (!managed || managed.skill !== skill.name || actualHash !== managed.hash)) {
          report.skipped.push({ ...item, reason: managed ? 'copy_modified' : 'copy_not_managed' });
          continue;
        }
        if (actualHash === null && state === false) {
          if (managed) delete ledger.copies[item.path];
          continue;
        }
        if (state === true && actualHash === sourceHash && !legacyLink) continue;
        if (state === true && actualHash === null && !target.installable) {
          if (managed) delete ledger.copies[item.path];
          continue;
        }
        if (state === true && actualHash === null && !target.detected && !managed && !fs.existsSync(target.directory)) continue;
        operations.push({ action: state ? 'install' : 'remove', skill: skill.name, source, source_root: options.skillsDirectory,
          target, expected_hash: actualHash, source_hash: sourceHash, ...(legacyLink ? { legacy_link: legacyLink } : {}) });
      }
    }
    if (!currentContext(options, contextFile, generation)) { report.status = 'stale'; return report; }
    // Persist adoption before later calls can apply a changed business snapshot.
    if (options.mode === 'adopt') {
      writeJson(ledgerFile, ledger);
    } else if (operations.length) {
      // Remove or materialize verified installer links before changing their canonical copy.
      operations.sort((a, b) => Number(Boolean(b.legacy_link)) - Number(Boolean(a.legacy_link)));
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
          if (skillCopyHash(item.path) !== null) { report.failed.push({ ...item, reason: 'removal_not_verified' }); continue; }
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
    return report;
  } catch {
    report.status = report.installed.length || report.removed.length || report.adopted.length ? 'partial' : 'failed';
    return report;
  } finally { unlock?.(); }
}
