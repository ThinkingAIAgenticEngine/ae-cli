// src/i18n/ae-locale.ts
// AE 系统的 umi_locale 格式 ↔ CLI locale 映射

import type { Locale } from './locale.js';

/** "zh-CN" / "zh_CN" → "zh" */
export function aeLocaleToCli(raw: string): Locale | null {
  const normalized = raw.trim().replace('-', '_').toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  return null;
}

/** "zh" → "zh_CN" (setAELang 接口使用的格式) */
export function cliLocaleToAE(locale: Locale): string {
  switch (locale) {
    case 'zh': return 'zh_CN';
    case 'en': return 'en_US';
    case 'ja': return 'ja_JP';
    case 'ko': return 'ko_KR';
  }
}
