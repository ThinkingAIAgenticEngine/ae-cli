import { fetchCliConfig, shouldSkipAutoSync } from './compat-check.js';
import { getActiveHost } from './config.js';
import { peekCliToken } from './cli-token.js';
import { resolveKbAutoDiscoveryFeature, type AutoDiscoveryFeature } from './feature-config.js';

/** Refresh company feature configuration once per day, including in sandbox runtimes. */
export async function runFeatureConfigCheck(
  hostOverride?: string,
  argv: string[] = process.argv,
): Promise<AutoDiscoveryFeature | undefined> {
  if (shouldSkipAutoSync(argv) || argv.slice(2).some((arg) =>
    arg === '--help' || arg === '-h' || arg === '--version' || arg === '-V')) return undefined;
  try {
    const host = hostOverride || getActiveHost();
    if (!host) return undefined;
    const token = peekCliToken(host);
    if (!token) return undefined;
    return await resolveKbAutoDiscoveryFeature(host, token, () => fetchCliConfig(host, token));
  } catch {
    // Optional feature configuration must not block an unrelated CLI command.
    return undefined;
  }
}
