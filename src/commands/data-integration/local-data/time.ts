/**
 * 20+ format time parsing, ported from ae-file-data-import and refactored to return
 * wall-clock parts instead of a Date so the branch's IANA timezone interpretation is preserved.
 *
 * The three `yyyy年M月d日` formats are real business-data formats and are preserved verbatim.
 */

export const TIME_FORMATS: string[] = [
  // Standard AE format
  'yyyy-MM-dd HH:mm:ss.SSS',
  'yyyy-MM-dd HH:mm:ss',
  // ISO 8601
  'yyyy-MM-ddTHH:mm:ss.SSS',
  'yyyy-MM-ddTHH:mm:ss',
  'yyyy-MM-ddTHH:mm:ssXXX',
  'yyyy-MM-ddTHH:mm:ss.SSSXXX',
  // Slash separated
  'yyyy/MM/dd HH:mm:ss',
  'yyyy/MM/dd',
  // Dot separated
  'yyyy.MM.dd HH:mm:ss',
  'yyyy.MM.dd',
  // Compact digits
  'yyyyMMddHHmmss',
  'yyyyMMddHHmm',
  'yyyyMMdd',
  // English month names
  'dd MMM yyyy HH:mm:ss',
  'MMMM dd yyyy HH:mm:ss',
  'MMM dd yyyy HH:mm:ss',
  // Chinese date
  'yyyy年M月d日',
  'yyyy年M月d日 HH:mm:ss',
  'yyyy年M月d日 HH时mm分ss秒',
  // Date only (require an explicit time_format)
  'MM/dd/yyyy HH:mm:ss',
  'dd/MM/yyyy HH:mm:ss',
];

export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export const MONTH_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

export interface WallTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

interface FormatToken {
  type: 'y' | 'M' | 'MMMM' | 'MMM' | 'd' | 'H' | 'h' | 'm' | 's' | 'S' | 'literal' | 'tz';
  size: number;
}

/** Parse a value against one strptime-like pattern, returning wall-clock parts or null. */
export function tryStrptime(value: string, format: string): WallTimeParts | null {
  return tryStrptimeTokens(value.trim(), tokenizeFormat(format));
}

/** True when any of the 21 formats parses the string (used for time-column inference). */
export function isParseableByAnyFormat(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return findFirstTimeFormat(value) !== null;
}

const TIME_PARSE_CACHE_MAX = 100_000;
const timeParseCache = new Map<string, string | null>();
let tokenizedFormats: FormatToken[][] | null = null;

function getTokenizedFormats(): FormatToken[][] {
  if (!tokenizedFormats) tokenizedFormats = TIME_FORMATS.map(tokenizeFormat);
  return tokenizedFormats;
}

/** First of the 21 formats that parses the string, or null (bounded memoized). */
export function findFirstTimeFormat(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const cached = timeParseCache.get(text);
  if (cached !== undefined) return cached;

  const formats = getTokenizedFormats();
  let match: string | null = null;
  for (let index = 0; index < formats.length; index += 1) {
    if (tryStrptimeTokens(text, formats[index])) {
      match = TIME_FORMATS[index];
      break;
    }
  }
  if (timeParseCache.size < TIME_PARSE_CACHE_MAX) timeParseCache.set(text, match);
  return match;
}

/** Wall-clock parts from the first of the 21 formats that parses the string. */
export function parseTimeByAnyFormat(value: string): WallTimeParts | null {
  const text = value.trim();
  if (!text) return null;
  for (const tokens of getTokenizedFormats()) {
    const parts = tryStrptimeTokens(text, tokens);
    if (parts) return parts;
  }
  return null;
}

function tryStrptimeTokens(v: string, tokens: FormatToken[]): WallTimeParts | null {
  const dateParts: Record<string, number> = {};
  let vi = 0;

  for (const tok of tokens) {
    if (tok.type === 'literal') {
      while (vi < v.length && /[\s\-T:./,年日月时分秒]/.test(v[vi])) vi += 1;
      continue;
    }
    if (tok.type === 'tz') {
      // The X token only consumes an offset — it does not resolve it. Callers must route
      // offset-bearing values to `new Date` instead of here (see conversion.normalizeTime).
      const match = v.slice(vi).match(/^([+-]\d{2}):?(\d{2})/);
      if (match) vi += match[0].length;
      continue;
    }
    if (tok.type === 'MMMM') {
      const match = v.slice(vi).match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/i);
      if (!match) return null;
      dateParts.M = MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1;
      vi += match[0].length;
      continue;
    }
    if (tok.type === 'MMM') {
      const match = v.slice(vi).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
      if (!match) return null;
      dateParts.M = MONTH_ABBR.indexOf(match[1].toLowerCase()) + 1;
      vi += match[0].length;
      continue;
    }

    const match = tok.type === 'S'
      ? v.slice(vi).match(/^(\d{1,3})/)
      : v.slice(vi).match(tok.size === 1 ? /^(\d+)/ : new RegExp(`^(\\d{${tok.size}})`));
    if (!match) return null;

    const num = parseInt(match[1], 10);
    switch (tok.type) {
      case 'y': dateParts.y = tok.size === 2 ? 2000 + num : num; break;
      case 'M': if (!dateParts.M) dateParts.M = num; break;
      case 'd': dateParts.d = num; break;
      case 'H': case 'h': dateParts.H = num; break;
      case 'm': dateParts.m = num; break;
      case 's': dateParts.s = num; break;
      case 'S': dateParts.S = num * Math.pow(10, 3 - match[1].length); break;
      default: break;
    }
    vi += match[0].length;
  }

  const parts: WallTimeParts = {
    year: dateParts.y ?? 2000,
    month: dateParts.M ?? 1,
    day: dateParts.d ?? 1,
    hour: dateParts.H ?? 0,
    minute: dateParts.m ?? 0,
    second: dateParts.s ?? 0,
    millisecond: dateParts.S ?? 0,
  };
  return isValidWallTimeParts(parts) ? parts : null;
}

export function isValidWallTimeParts(parts: WallTimeParts): boolean {
  if (parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59
    || parts.second < 0 || parts.second > 59 || parts.millisecond < 0 || parts.millisecond > 999) {
    return false;
  }
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day;
}

function tokenizeFormat(format: string): FormatToken[] {
  const tokens: FormatToken[] = [];
  let i = 0;
  while (i < format.length) {
    const ch = format[i];
    if (ch === 'y') {
      let n = 0; while (i + n < format.length && format[i + n] === 'y') n += 1;
      tokens.push({ type: 'y', size: n }); i += n;
    } else if (ch === 'M') {
      if (format.slice(i, i + 4) === 'MMMM') { tokens.push({ type: 'MMMM', size: 0 }); i += 4; }
      else if (format.slice(i, i + 3) === 'MMM') { tokens.push({ type: 'MMM', size: 0 }); i += 3; }
      else {
        let n = 0; while (i + n < format.length && format[i + n] === 'M') n += 1;
        tokens.push({ type: 'M', size: n }); i += n;
      }
    } else if (ch === 'd') {
      let n = 0; while (i + n < format.length && format[i + n] === 'd') n += 1;
      tokens.push({ type: 'd', size: n }); i += n;
    } else if (ch === 'H') {
      let n = 0; while (i + n < format.length && format[i + n] === 'H') n += 1;
      tokens.push({ type: 'H', size: n }); i += n;
    } else if (ch === 'h') {
      let n = 0; while (i + n < format.length && format[i + n] === 'h') n += 1;
      tokens.push({ type: 'h', size: n }); i += n;
    } else if (ch === 'm') {
      let n = 0; while (i + n < format.length && format[i + n] === 'm') n += 1;
      tokens.push({ type: 'm', size: n }); i += n;
    } else if (ch === 's') {
      let n = 0; while (i + n < format.length && format[i + n] === 's') n += 1;
      tokens.push({ type: 's', size: n }); i += n;
    } else if (ch === 'S') {
      let n = 0; while (i + n < format.length && format[i + n] === 'S') n += 1;
      tokens.push({ type: 'S', size: n }); i += n;
    } else if (ch === 'T') {
      tokens.push({ type: 'literal', size: 0 }); i += 1;
    } else if (ch === 'X') {
      let n = 0; while (i + n < format.length && format[i + n] === 'X') n += 1;
      tokens.push({ type: 'tz', size: n }); i += n;
    } else {
      tokens.push({ type: 'literal', size: 0 }); i += 1;
    }
  }
  return tokens;
}
