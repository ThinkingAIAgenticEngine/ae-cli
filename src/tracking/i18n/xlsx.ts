// src/i18n/xlsx.ts
// XLSX 多语言查询入口 — 供 write.ts / read.ts / md.ts 使用

export { type Locale } from './locale.js';
export { detectXlsxLocale, setXlsxLocale } from './locale.js';
export { sheetName, allSheetNames } from './resources/xlsx/sheets.js';
export { headerName, allHeaderNames } from './resources/xlsx/headers.js';
export { typeToDisplay, displayToType } from './resources/xlsx/types.js';
