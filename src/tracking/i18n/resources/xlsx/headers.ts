// src/i18n/resources/xlsx/headers.ts
// 列头名映射 — 从 AE 后台各语言官方模板提取，逐字符一致
// en/ja/ko: 来自 2026-06-09 下载的项目导出 xlsx（含 Platform 列）
// zh: 来自 tracking-plan-template/TE官方模板_dataTrackSample.xlsx

import type { Locale } from './sheets.js';

export const HEADERS: Record<string, Record<Locale, string>> = {
  // === #事件数据 (9 列) ===
  event_name: {
    zh: '事件名（必填）',
    en: 'Event Name',
    ja: 'イベント名（必須）',
    ko: '이벤트 이름 (필수)',
  },
  event_display_name: {
    zh: '事件显示名',
    en: 'Event Display Name',
    ja: 'イベント表示名',
    ko: '이벤트 표시 이름',
  },
  event_desc: {
    zh: '事件说明',
    en: 'Event Description',
    ja: 'イベント説明',
    ko: '이벤트 설명',
  },
  event_tag: {
    zh: '事件标签',
    en: 'Event Tag',
    ja: 'カテゴリ',
    ko: '이벤트 태그',
  },
  platform: {
    zh: '采集端',
    en: 'Platform',
    ja: 'プラットフォーム',
    ko: '플랫폼',
  },
  prop_name: {
    zh: '属性名（必填）',
    en: 'Property Name',
    ja: 'プロパティ名（必須）',
    ko: '속성 이름 (필수)',
  },
  prop_display_name: {
    zh: '属性显示名',
    en: 'Property Display Name',
    ja: 'プロパティ表示名',
    ko: '속성 표시 이름',
  },
  prop_type: {
    zh: '属性类型（必填）',
    en: 'Data Type',
    ja: 'プロパティタイプ（必須）',
    ko: '속성 유형 (필수)',
  },
  prop_desc: {
    zh: '属性说明',
    en: 'Property Description',
    ja: 'プロパティ説明',
    ko: '속성 설명',
  },

  // === #公共事件属性 (4 列) ===
  common_prop_name: {
    zh: '属性名（必填）',
    en: 'Property Name',
    ja: 'プロパティ名（必須）',
    ko: '속성 이름 (필수)',
  },
  common_prop_display_name: {
    zh: '属性显示名',
    en: 'Property Display Name',
    ja: 'プロパティ表示名',
    ko: '속성 표시 이름',
  },
  common_prop_type: {
    zh: '属性类型（必填）',
    en: 'Data Type',
    ja: 'プロパティタイプ（必須）',
    ko: '속성 유형 (필수)',
  },
  common_prop_desc: {
    zh: '属性说明',
    en: 'Property Description',
    ja: 'プロパティ説明',
    ko: '속성 설명',
  },

  // === #用户数据 (6 列) ===
  user_prop_name: {
    zh: '属性名（必填）',
    en: 'Property Name',
    ja: 'プロパティ名（必須）',
    ko: '속성 이름 (필수)',
  },
  user_prop_display_name: {
    zh: '属性显示名',
    en: 'Property Display Name',
    ja: 'プロパティ表示名',
    ko: '속성 표시 이름',
  },
  user_prop_type: {
    zh: '属性类型（必填）',
    en: 'Data Type',
    ja: 'プロパティタイプ（必須）',
    ko: '속성 유형 (필수)',
  },
  update_type: {
    zh: '更新方式',
    en: 'Update Type',
    ja: '更新方法',
    ko: '업데이트 방식',
  },
  user_prop_desc: {
    zh: '属性说明',
    en: 'Property Description',
    ja: 'プロパティ説明',
    ko: '속성 설명',
  },
  prop_tag: {
    zh: '属性标签',
    en: 'Property Tag',
    ja: 'カテゴリ',
    ko: '속성 태그',
  },

  // === #用户ID体系 (4 列，不含"游戏类型"前置列) ===
  user_id_prop_name: {
    zh: '属性名',
    en: 'Property',
    ja: '属性名',
    ko: '속성 이름',
  },
  user_id_display_name: {
    zh: '属性显示名',
    en: 'Display Name',
    ja: '属性表示名',
    ko: '속성 표시 이름',
  },
  user_id_desc: {
    zh: '属性说明',
    en: 'Description',
    ja: '属性説明',
    ko: '속성 설명',
  },
  user_id_value_desc: {
    zh: '赋值说明',
    en: 'Value Description',
    ja: '代入説明',
    ko: '값 설명',
  },
} as const;

/** 获取指定列头在各语言下的名称 */
export function headerName(key: keyof typeof HEADERS, locale: Locale): string {
  return HEADERS[key][locale];
}

/** 某个列头在所有语言中的候选名称（用于 reader 全量匹配） */
export function allHeaderNames(key: keyof typeof HEADERS): string[] {
  return Object.values(HEADERS[key]);
}
