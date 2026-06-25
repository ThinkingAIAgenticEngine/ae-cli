import { Command } from 'commander';
import { mkdir, readlink, lstat, unlink, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { getConfigDir, getPackageRoot, getWikiSymlinkDir } from '../../tracking/paths.js';
import {
  getClaudeSkillsDir,
  getCodexSkillsDir,
  getCursorSkillsDir,
  isCodexInstalled,
  isCursorInstalled,
} from './home.js';
import { t } from '../../tracking/i18n/translate.js';

const SKILL_NAMES = ['ae-generate-tracking-plan', 'ae-generate-tracking-code', 'ae-data-integration-helper'] as const;
const CLAUDE_MD = 'CLAUDE.md';
const AGENTS_MD = 'AGENTS.md';

export interface InitOptions {
  quiet?: boolean;
  force?: boolean;
  uninstall?: boolean;
}

export interface InitReport {
  installed: string[];
  skipped: string[];
  conflicts: string[];
  uninstalled: string[];
}

async function linkTarget(path: string): Promise<string | null> {
  try {
    const s = await lstat(path);
    if (!s.isSymbolicLink()) return 'NOT_SYMLINK';
    return await readlink(path);
  } catch {
    return null;
  }
}

async function linkSkill(
  name: string,
  src: string,
  dst: string,
  opts: InitOptions,
  report: InitReport,
  label: string,
): Promise<void> {
  const target = await linkTarget(dst);
  if (opts.uninstall) {
    if (target === src) {
      await unlink(dst);
      report.uninstalled.push(`${name} (${label})`);
    }
    return;
  }
  if (target === src) { report.skipped.push(`${name} (${label})`); return; }
  if (target === null) {
    await symlink(src, dst, 'dir');
    report.installed.push(`${name} (${label})`);
    return;
  }
  if (opts.force && target !== 'NOT_SYMLINK') {
    await unlink(dst);
    await symlink(src, dst, 'dir');
    report.installed.push(`${name} (${label})`);
  } else {
    report.conflicts.push(`${name} (${label})`);
  }
}

export async function runInit(opts: InitOptions = {}): Promise<InitReport> {
  const pkg = getPackageRoot();
  const skillsDir = getClaudeSkillsDir();
  const codexSkillsDir = getCodexSkillsDir();
  const cursorSkillsDir = getCursorSkillsDir();
  const isCodex = isCodexInstalled();
  const isCursor = isCursorInstalled();

  await mkdir(skillsDir, { recursive: true });
  if (isCodex) await mkdir(codexSkillsDir, { recursive: true });
  if (isCursor) await mkdir(cursorSkillsDir, { recursive: true });

  const rep: InitReport = { installed: [], skipped: [], conflicts: [], uninstalled: [] };

  for (const name of SKILL_NAMES) {
    const src = join(pkg, 'skills', name);
    const dst = join(skillsDir, name);
    await linkSkill(name, src, dst, opts, rep, 'Claude Code');

    if (isCodex) {
      const codexDst = join(codexSkillsDir, name);
      await linkSkill(name, src, codexDst, opts, rep, 'Codex');
    }

    if (isCursor) {
      const cursorDst = join(cursorSkillsDir, name);
      await linkSkill(name, src, cursorDst, opts, rep, 'Cursor');
    }
  }

  const wikiSrc = join(pkg, 'wiki', 'te-docs');
  const wikiDst = getWikiSymlinkDir();
  if (!opts.uninstall) {
    await mkdir(getConfigDir(), { recursive: true });
    const wt = await linkTarget(wikiDst);
    if (wt === wikiSrc) {
      if (!opts.quiet) console.log(t('init.skipped_wiki'));
    } else if (wt === null) {
      await symlink(wikiSrc, wikiDst, 'dir');
      if (!opts.quiet) console.log(t('init.installed_wiki'));
    } else if (opts.force && wt !== 'NOT_SYMLINK') {
      await unlink(wikiDst);
      await symlink(wikiSrc, wikiDst, 'dir');
      if (!opts.quiet) console.log(t('init.installed_wiki_forced'));
    } else {
      if (!opts.quiet) console.warn(t('init.conflict_wiki'));
    }
  } else {
    const wt = await linkTarget(wikiDst);
    if (wt === wikiSrc) {
      await unlink(wikiDst);
      if (!opts.quiet) console.log(t('init.uninstalled_wiki'));
    }
  }

  if (isCodex && !opts.uninstall) {
    const cwd = process.cwd();
    const claudeMdPath = join(cwd, CLAUDE_MD);
    const agentsMdPath = join(cwd, AGENTS_MD);
    const at = await linkTarget(agentsMdPath);
    if (at === claudeMdPath) {
      if (!opts.quiet) console.log(t('init.skipped_agents_md'));
    } else if (at === null) {
      await symlink(claudeMdPath, agentsMdPath, 'file');
      if (!opts.quiet) console.log(t('init.installed_agents_md'));
    } else if (opts.force && at !== 'NOT_SYMLINK') {
      await unlink(agentsMdPath);
      await symlink(claudeMdPath, agentsMdPath, 'file');
      if (!opts.quiet) console.log(t('init.installed_agents_md_forced'));
    } else {
      if (!opts.quiet) console.warn(t('init.conflict_agents_md'));
    }
  } else if (opts.uninstall && isCodex) {
    const cwd = process.cwd();
    const agentsMdPath = join(cwd, AGENTS_MD);
    const at = await linkTarget(agentsMdPath);
    if (at === join(cwd, CLAUDE_MD)) {
      await unlink(agentsMdPath);
      if (!opts.quiet) console.log(t('init.uninstalled_agents_md'));
    }
  }

  if (!opts.quiet) {
    for (const n of rep.installed) console.log(t('init.installed_skill', { name: n }));
    for (const n of rep.skipped) console.log(t('init.skipped_skill', { name: n }));
    for (const n of rep.conflicts) console.warn(t('init.conflict_skill', { name: n }));
    for (const n of rep.uninstalled) console.log(t('init.uninstalled_skill', { name: n }));
  }
  return rep;
}

export function registerInit(cmd: Command): void {
  cmd.description('install/uninstall tracking skills into ~/.claude/skills/')
    .option('--force', 'overwrite conflicting third-party symlinks')
    .option('--uninstall', 'remove symlinks that point to this package')
    .action(async (opts: { force?: boolean; uninstall?: boolean }) => {
      await runInit({ force: opts.force, uninstall: opts.uninstall });
    });
}
