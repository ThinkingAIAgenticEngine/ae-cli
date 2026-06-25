// src/i18n/resources/xlsx/sheets.ts
// Sheet 名映射 — 从 AE 后台各语言官方模板提取，逐字符一致
// 来源：2026-06-09 从 AE 后台下载的 zh/en/ja/ko dataTrackSample.xlsx

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

export const SHEET_NAMES: Record<string, Record<Locale, string>> = {
  event_data: {
    zh: '#事件数据',
    en: '#event data',
    ja: '#イベントデータ',
    ko: '#이벤트 데이터',
  },
  common_props: {
    zh: '#公共事件属性',
    en: '#super property',
    ja: '#パブリックイベントプロパティ',
    ko: '#공통 이벤트 속성',
  },
  user_data: {
    zh: '#用户数据',
    en: '#user data',
    ja: '#ユーザーデータ',
    ko: '#유저 데이터',
  },
  user_id: {
    zh: '#用户ID体系',
    en: '#ID mapping rule',
    ja: '#ユーザーIDシステム',
    ko: '#유저 ID 체계',
  },
} as const;

/** 获取指定 sheet 在各语言下的名称 */
export function sheetName(key: keyof typeof SHEET_NAMES, locale: Locale): string {
  return SHEET_NAMES[key][locale];
}

/** 所有语言的 sheet 名集合（用于 reader 匹配） */
export function allSheetNames(key: keyof typeof SHEET_NAMES): string[] {
  return Object.values(SHEET_NAMES[key]);
}
