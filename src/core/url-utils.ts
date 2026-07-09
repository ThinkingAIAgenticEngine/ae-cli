/**
 * Normalize an AE host URL for use as a config key.
 * - Prepends https:// when no scheme is given
 * - Strips trailing slashes so equivalent hosts share one key
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}
