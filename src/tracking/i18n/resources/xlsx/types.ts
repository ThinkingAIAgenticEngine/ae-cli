// src/i18n/resources/xlsx/types.ts
// 属性类型显示值映射 — 从 AE 后台各语言官方模板提取
// 来源：en/ja/ko 项目导出 xlsx（2026-06-09），zh 来自现有代码

import type { Locale } from './sheets.js';
import type { PropType } from '../../../plan/types.js';

export const PROP_TYPE_DISPLAY: Record<PropType, Record<Locale, string>> = {
  string:       { zh: '文本',     en: 'string',     ja: 'ストリング',  ko: 'string' },
  number:       { zh: '数值',     en: 'number',     ja: '数値',        ko: 'number' },
  bool:         { zh: '布尔',     en: 'boolean',    ja: 'ブール値',     ko: 'boolean' },
  datetime:     { zh: '时间',     en: 'datetime',   ja: '時間',        ko: 'time' },
  object:       { zh: '对象',     en: 'object',     ja: 'オブジェクト',  ko: 'object' },
  array_row:    { zh: '对象组',   en: 'object[]',   ja: 'オブジェクト配列', ko: 'object_array' },
  array_string: { zh: '列表',     en: 'string[]',   ja: '配列',        ko: 'string_array' },
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
  '对象': 'object',
  // en alias
  'String': 'string',
  'Number': 'number',
  'Boolean': 'bool',
  'Bool': 'bool',
  'DateTime': 'datetime',
  'Time': 'datetime',
  'Object': 'object',
  'Row': 'object',
  'Object Array': 'array_row',
  'List': 'array_string',
  'String Array': 'array_string',
  // ja alias
  '文字列': 'string',
  'テキスト': 'string',
  'ブール': 'bool',
  '日時': 'datetime',
  // ko alias
  '텍스트': 'string',
  '문자열': 'string',
  '숫자': 'number',
  '부울': 'bool',
  '날짜시간': 'datetime',
  '객체 배열': 'array_row',
  '리스트': 'array_string',
};
Object.assign(ALL_DISPLAY_TO_TYPE, ALIASES);

/** 显示值 → canonical（全语言匹配，含 alias） */
export function displayToType(raw: string): PropType | null {
  const trimmed = raw.trim();
  return ALL_DISPLAY_TO_TYPE[trimmed] ?? null;
}
