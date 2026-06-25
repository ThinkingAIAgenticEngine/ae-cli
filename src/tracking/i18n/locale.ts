// src/i18n/locale.ts
// 语言检测 — CLI 界面语言 和 XLSX 语言 独立判断

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

const VALID_LOCALES = new Set<string>(['zh', 'en', 'ja', 'ko']);

function normalize(raw: string): Locale {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith('zh') || lower.startsWith('cn')) return 'zh';
  if (lower.startsWith('ja') || lower.startsWith('jp')) return 'ja';
  if (lower.startsWith('ko') || lower.startsWith('kr')) return 'ko';
  if (lower.startsWith('en')) return 'en';
  if (VALID_LOCALES.has(lower)) return lower as Locale;
  return 'en';
}

// ============================================================
// CLI 界面语言 — 控制 console.log / 错误消息 / 提示文本
// ============================================================

let _cliLocale: Locale | undefined;

/** 检测 CLI 界面语言 */
export function detectCliLocale(): Locale {
  if (_cliLocale) return _cliLocale;

  // 1. 环境变量显式指定
  if (process.env.AE_LANG) {
    _cliLocale = normalize(process.env.AE_LANG);
    return _cliLocale;
  }

  // 2. 系统 locale
  const sys = (process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '').toLowerCase();
  if (sys) {
    _cliLocale = normalize(sys);
    return _cliLocale;
  }

  // 3. 默认英文
  _cliLocale = 'en';
  return _cliLocale;
}

/** 覆盖 CLI 语言（测试用） */
export function setCliLocale(locale: Locale): void {
  _cliLocale = locale;
}

// ============================================================
// XLSX 语言 — 控制 Sheet 名 / 列头名 / 类型显示值
// ============================================================

let _xlsxLocale: Locale | undefined;

/** 检测 XLSX 语言 */
export function detectXlsxLocale(opts?: {
  draftMetaLang?: string;
  cliFlag?: string;
}): Locale {
  // 1. draft.json 中已存的语言
  if (opts?.draftMetaLang && VALID_LOCALES.has(opts.draftMetaLang)) {
    _xlsxLocale = opts.draftMetaLang as Locale;
    return _xlsxLocale;
  }

  // 2. CLI --lang 参数
  if (opts?.cliFlag) {
    _xlsxLocale = normalize(opts.cliFlag);
    return _xlsxLocale;
  }

  // 3. 跟随 CLI 语言
  return detectCliLocale();
}

/** 覆盖 XLSX 语言（测试用） */
export function setXlsxLocale(locale: Locale): void {
  _xlsxLocale = locale;
}
