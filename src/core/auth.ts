import { getActiveHost } from './config.js';
import { normalizeUrl } from './url-utils.js';

/** Resolve --host first, otherwise use the configured active host. */
export function resolveHost(hostOverride?: string): string {
  if (hostOverride) return normalizeUrl(hostOverride);
  return getActiveHost();
}
