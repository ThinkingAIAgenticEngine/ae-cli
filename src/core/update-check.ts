export function shouldSkipUpdateCheck(argv: string[] = process.argv): boolean {
  if (process.env.AE_CLI_NO_UPDATE_CHECK === '1') return true;
  if (process.env.CI === 'true' || process.env.CI === '1') return true;

  return argv.slice(2).some((arg, index, args) => {
    if (arg === '--no-update-check') return true;
    if (arg === '--version') {
      const value = args[index + 1];
      return !value || value.startsWith('-');
    }
    if (arg === '-V' || arg === '--help' || arg === '-h') return true;
    return false;
  });
}

function parseVersion(version: string): number[] {
  const core = version.trim().split('-')[0];
  return core.split('.').map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** Returns true when `latest` is strictly newer than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}
