import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSONbig = require('json-bigint');

// Using the storeAsString option, large numbers outside the safe range are parsed directly as strings
// json-bigint uses string.length > 15 to determine whether a number is large
const jsonParser = JSONbig({ storeAsString: true });

/**
 * Safely parses JSON, converting large numbers (outside JavaScript's safe integer range) to strings
 * - Integers within safe range (<=15 digits): kept as number type
 * - Large numbers outside safe range (>15 digits): converted to string type, preserving precision
 * - Floating-point numbers: kept as number type
 */
export function safeJsonParse(text: string): any {
  return jsonParser.parse(text);
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
