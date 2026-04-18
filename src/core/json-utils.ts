import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSONbig = require('json-bigint');

// 使用 storeAsString 选项，超过安全范围的大数字直接解析为字符串
// json-bigint 使用 string.length > 15 判断是否为大数
const jsonParser = JSONbig({ storeAsString: true });

/**
 * 安全解析 JSON，大数字（超过 JavaScript 安全整数范围）会转换为字符串
 * - 安全范围内的整数 (≤15位): 保持为 number 类型
 * - 超出安全范围的大数 (>15位): 转换为 string 类型，保持精度
 * - 浮点数: 保持为 number 类型
 */
export function safeJsonParse(text: string): any {
  return jsonParser.parse(text);
}

/**
 * 安全读取 JSON 文件，大数字会转换为字符串
 */
export function safeReadJsonFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return safeJsonParse(content);
}

/**
 * 安全序列化 JSON，bigint 类型会转换为字符串
 */
export function safeJsonStringify(obj: any, space?: number | string): string {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, space);
}
