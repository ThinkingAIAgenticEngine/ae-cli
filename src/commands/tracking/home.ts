import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export function getHomeDir(): string {
  return process.env.HOME ?? homedir();
}

export function getClaudeSkillsDir(): string {
  return join(getHomeDir(), '.claude', 'skills');
}

export function getCodexSkillsDir(): string {
  return join(getHomeDir(), '.codex', 'skills');
}

export function getCursorSkillsDir(): string {
  return join(getHomeDir(), '.cursor', 'skills');
}

export function isCodexInstalled(): boolean {
  return existsSync(getCodexSkillsDir());
}

export function isCursorInstalled(): boolean {
  return existsSync(getCursorSkillsDir());
}
