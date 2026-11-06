import type { Command } from 'commander';
import type { EnvironmentRefreshResult } from '../core/environment-refresh.js';

/** Keep terminal refresh results concise without changing machine-readable reports. */
export function environmentRefreshOutput(program: Command, result: EnvironmentRefreshResult) {
  const options = program.opts();
  if (!process.stdout.isTTY || !process.stderr.isTTY || options.jq
    || (options.format === 'json' && program.getOptionValueSource('format') === 'cli')) {
    return result;
  }

  const { skills, ...environment } = result;
  return {
    ...environment,
    skills: {
      status: skills.status,
      installed_count: 'installed' in skills ? skills.installed.length : 0,
      removed_count: 'removed' in skills ? skills.removed.length : 0,
      ...('skipped' in skills && skills.skipped.length ? { skipped_count: skills.skipped.length } : {}),
      ...('failed' in skills && skills.failed.length ? { failed_count: skills.failed.length } : {}),
      ...('reason' in skills ? { reason: skills.reason } : {}),
    },
  };
}
