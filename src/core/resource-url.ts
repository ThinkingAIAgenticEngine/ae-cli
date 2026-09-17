const LOCAL_BACKEND_PORTS = new Set(['8992', '8996']);

/**
 * Capability and MCP backends may return resource links as relative SPA paths, e.g.
 *   raw_url:       "/#/panel/panel/3_10"
 *   markdown_link: "[View Resource](/#/panel/panel/3_10)"
 * In a local ae-cli / terminal context those are not directly clickable. Rewrite
 * relative URL/link fields to absolute URLs by prepending the AE web host.
 */
export function normalizeResourceUrlFields(node: unknown, host: string, sourceHost = host): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (/url|link/i.test(key) || value.includes('/#/')) {
        obj[key] = normalizeResourceUrls(value, host, sourceHost);
      }
    } else if (value && typeof value === 'object') {
      normalizeResourceUrlFields(value, host, sourceHost);
    }
  }
}

export function absolutizeRelativeUrls(s: string, host: string): string {
  return normalizeResourceUrls(s, host);
}

export function normalizeResourceUrls(s: string, host: string, sourceHost = host): string {
  const base = host.replace(/\/+$/, '');
  const sourceBase = sourceHost.replace(/\/+$/, '');
  if (sourceBase && sourceBase !== base) {
    s = s.replace(new RegExp(`${escapeRegExp(sourceBase)}/#`, 'g'), `${base}/#`);
  }
  s = s.replace(/\]\((\/(?!\/)[^)]*)\)/g, `](${base}$1)`);
  if (/^\/(?!\/)/.test(s)) s = base + s;
  return s;
}

export function resolvePublicWebHost(host: string): string {
  const override = process.env.AE_CLI_PUBLIC_WEB_URL || process.env.AE_CLI_WEB_HOST;
  if (override?.trim()) {
    return override.trim().replace(/\/+$/, '');
  }

  try {
    const url = new URL(host);
    if ((url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && LOCAL_BACKEND_PORTS.has(url.port)) {
      url.port = '10010';
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    // Fall through to the original host for non-URL config values.
  }
  return host.replace(/\/+$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
