import path from 'node:path';

export const CONFIG_DIR_ENV = 'AE_CLI_CONFIG_DIR';

export function hasConfigDirOverride(): boolean {
  return Boolean(process.env[CONFIG_DIR_ENV]?.trim());
}

export function getConfigDir(): string {
  const home = process.env.HOME || '';
  const configured = process.env[CONFIG_DIR_ENV]?.trim();
  if (!configured) return path.join(home, '.ae-cli');

  const expanded = configured
    .replace(/^\$\{HOME\}(?=\/|$)/, home)
    .replace(/^\$HOME(?=\/|$)/, home);
  return path.resolve(expanded);
}
