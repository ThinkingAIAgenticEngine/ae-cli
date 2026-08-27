import { isIP } from 'node:net';

/**
 * Strip paired single or double quotes around a string value, then trim surrounding
 * whitespace. Mirrors `stripQuotes` in the standalone `ae-file-data-import` tool: only a
 * paired quote pair is removed (`'u001'` -> `u001`, `"purchase"` -> `purchase`); a single
 * unmatched quote is preserved. Non-string values pass through untouched so NDJSON
 * numbers, booleans, lists, and objects keep their native type.
 */
export function stripQuotes(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value;
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1).trim();
  }
  return text.trim();
}

/** Standard 36-character UUID: 8-4-4-4-12 hexadecimal digits, case-insensitive. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is a standard 36-character UUID (paired quotes stripped first). */
export function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return UUID_PATTERN.test(stripQuotes(value) as string);
}

/** True when the value is a valid IPv4 or IPv6 address (paired quotes stripped first). */
export function isValidIp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return isIP(stripQuotes(value) as string) !== 0;
}

/**
 * True when the value is a valid IP in a private, loopback, or link-local range
 * (IPv4: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16; IPv6: ::1, fc00::/7, fe80::/10).
 * AE cannot resolve geo information for these addresses.
 */
export function isPrivateIp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = stripQuotes(value) as string;
  const version = isIP(text);
  if (version === 6) {
    const lower = text.toLowerCase();
    if (lower === '::1') return true;
    const first = lower.split(':')[0];
    return first.startsWith('fc') || first.startsWith('fd') || /^fe[89ab]/.test(lower);
  }
  if (version !== 4) return false;
  const octets = text.split('.').map((part) => Number(part));
  const [first, second] = octets;
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first === 127
    || (first === 169 && second === 254);
}
