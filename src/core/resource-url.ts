/**
 * Capability and MCP backends may return resource links as relative SPA paths, e.g.
 *   raw_url:       "/#/panel/panel/3_10"
 *   markdown_link: "[View Resource](/#/panel/panel/3_10)"
 * In a local ae-cli / terminal context those are not directly clickable. Rewrite
 * relative URL/link fields to absolute URLs by prepending the AE host.
 */
export function normalizeResourceUrlFields(node: unknown, host: string): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (/url|link/i.test(key) || value.includes('/#/')) {
        obj[key] = absolutizeRelativeUrls(value, host);
      }
    } else if (value && typeof value === 'object') {
      normalizeResourceUrlFields(value, host);
    }
  }
}

export function absolutizeRelativeUrls(s: string, host: string): string {
  const base = host.replace(/\/+$/, '');
  s = s.replace(/\]\((\/(?!\/)[^)]*)\)/g, `](${base}$1)`);
  if (/^\/(?!\/)/.test(s)) s = base + s;
  return s;
}
