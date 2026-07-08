import type { Command } from 'commander';
import { existsSync, statSync } from 'node:fs';
import { resolveHost } from '../../core/auth.js';
import { t } from '../../tracking/i18n/translate.js';

const HOST_OPTION_DESC = 'Override active AE host URL';

export function resolveTrackingHost(program: Command, opts: { host?: string }): string {
  const root = program.root ?? program;
  const globalHost = root.opts()?.host as string | undefined;
  const explicitHost = opts.host || globalHost;
  const host = resolveHost(explicitHost);
  if (!host) {
    throw new Error('No active AE host configured. Run: ae-cli auth login');
  }
  return host;
}

function isExistingDirectory(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Ensure a CLI output path points to a file, not a directory. */
export function assertOutputFilePath(path: string, optionName = '--out'): void {
  const trimmed = path.trim();
  if (trimmed.endsWith('/') || trimmed.endsWith('\\') || isExistingDirectory(trimmed)) {
    console.error(t('error.output_path_is_directory', { path: trimmed, option: optionName }));
    process.exit(1);
  }
}

/** Ensure a CLI input path exists and is a regular file. */
export function assertInputFilePath(path: string, optionName = '--in'): void {
  const trimmed = path.trim();
  if (!existsSync(trimmed)) {
    console.error(t('error.input_path_not_found', { path: trimmed, option: optionName }));
    process.exit(1);
  }
  if (isExistingDirectory(trimmed)) {
    console.error(t('error.input_path_is_directory', { path: trimmed, option: optionName }));
    process.exit(1);
  }
}

export { HOST_OPTION_DESC };
