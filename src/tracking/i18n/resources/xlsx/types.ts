// src/i18n/resources/xlsx/types.ts
// 属性类型显示值映射 — 来自 AE 产品侧官方定义
// 2026-07-15 按产品规范修正 en/ja/ko（旧值保留在 ALIASES 做 reader 兼容）

import type { Locale } from './sheets.js';
import type { PropType } from '../../../plan/types.js';

export const PROP_TYPE_DISPLAY: Record<PropType, Record<Locale, string>> = {
  string:       { zh: '文本', en: 'String', ja: 'ストリング',  ko: 'String' },
  number:       { zh: '数值', en: 'Number', ja: '数値',        ko: 'Number' },
  bool:         { zh: '布尔', en: 'Boolean', ja: 'ブール値',    ko: 'Boolean' },
  datetime:     { zh: '时间', en: 'Date',   ja: '時間',        ko: 'Date' },
  object:       { zh: '对象', en: 'Row',    ja: 'オブジェクト',  ko: 'Row' },
  array_row:    { zh: '对象组', en: 'Array Row', ja: 'オブジェクトグループ', ko: 'Array Row' },
  array_string: { zh: '列表',   en: 'List',      ja: 'リスト',              ko: 'List' },
};

/** canonical → 显示值（写 xlsx 用） */
export function typeToDisplay(type: PropType, locale: Locale): string {
  return PROP_TYPE_DISPLAY[type][locale];
}

/**
 * 显示值 → canonical（读 xlsx 用）
 * 包含所有语言变体和已知 alias
 */
const ALL_DISPLAY_TO_TYPE: Record<string, PropType> = {};
for (const [canonical, locales] of Object.entries(PROP_TYPE_DISPLAY)) {
  for (const val of Object.values(locales)) {
    ALL_DISPLAY_TO_TYPE[val] = canonical as PropType;
  }
}
// 已知 alias
const ALIASES: Record<string, PropType> = {
  // zh alias（行业模板）
  '字符串': 'string',
  // en alias（旧值兼容 — 2026-07-15 前生成的老 xlsx）
  'string': 'string',
  'number': 'number',
  'boolean': 'bool',
  'datetime': 'datetime',
  'object': 'object',
  'object[]': 'array_row',
  'string[]': 'array_string',
  // en 额外 alias
  'Bool': 'bool',
  'DateTime': 'datetime',
  'Time': 'datetime',
  'Object': 'object',
  'Object Array': 'array_row',
  'String Array': 'array_string',
  // ja alias
  '文字列': 'string',
  'テキスト': 'string',
  'ブール': 'bool',
  '日時': 'datetime',
  // ja 旧值兼容
  'オブジェクト配列': 'array_row',
  '配列': 'array_string',
  // ko alias
  '텍스트': 'string',
  '문자열': 'string',
  '숫자': 'number',
  '부울': 'bool',
  '날짜시간': 'datetime',
  '객체 배열': 'array_row',
  '리스트': 'array_string',
  // ko 旧值兼容
  'time': 'datetime',
  'object_array': 'array_row',
  'string_array': 'array_string',
};
Object.assign(ALL_DISPLAY_TO_TYPE, ALIASES);

/** 显示值 → canonical（全语言匹配，含 alias） */
export function displayToType(raw: string): PropType | null {
  const trimmed = raw.trim();
  return ALL_DISPLAY_TO_TYPE[trimmed] ?? null;
}
