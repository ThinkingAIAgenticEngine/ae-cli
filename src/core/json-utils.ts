import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSONbig = require('json-bigint');

// json-bigint checks token length rather than integer safety when storeAsString
// is enabled. Compare its lossless result with the native parse so only bare
// unsafe integers stay strings; decimal and exponent tokens remain numbers.
const jsonParser = JSONbig({ storeAsString: true });
const INTEGER_TOKEN = /^-?(?:0|[1-9]\d*)$/;

function normalizeParsedNumbers(lossless: any, native: any): any {
  if (typeof lossless === 'string' && typeof native === 'number') {
    if (INTEGER_TOKEN.test(lossless) && !Number.isSafeInteger(native)) {
      return lossless;
    }
    return native;
  }

  if (Array.isArray(lossless) && Array.isArray(native)) {
    for (let index = 0; index < lossless.length; index++) {
      lossless[index] = normalizeParsedNumbers(lossless[index], native[index]);
    }
    return lossless;
  }

  if (lossless !== null && native !== null
    && typeof lossless === 'object' && typeof native === 'object') {
    for (const key of Object.keys(lossless)) {
      lossless[key] = normalizeParsedNumbers(lossless[key], native[key]);
    }
  }
  return lossless;
}

/**
 * Safely parses JSON, converting large numbers (outside JavaScript's safe integer range) to strings
 * - Bare integer tokens within JavaScript's safe range: kept as number type
 * - Bare integer tokens outside JavaScript's safe range: converted to string type, preserving precision
 * - Decimal and exponent tokens: kept as number type
 */
export function safeJsonParse(text: string): any {
  const lossless = jsonParser.parse(text);
  return normalizeParsedNumbers(lossless, JSON.parse(text));
}

/**
 * Safely reads a JSON file, converting large numbers to strings
 */
export function safeReadJsonFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return safeJsonParse(content);
}

/**
 * Safely serializes JSON, converting bigint values to strings
 */
export function safeJsonStringify(obj: any, space?: number | string): string {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, space);
}
