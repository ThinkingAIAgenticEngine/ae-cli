import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Draft, Event, Property, UserProperty, PropType, UpdateType, Source } from '../plan/types.js';
import { displayToType, allSheetNames } from '../i18n/xlsx.js';

// MD 模板 section 标题：取 xlsx sheet 名去掉 # 前缀，支持多语言
const MD_SECTIONS: Record<string, string[]> = {
  event_data: allSheetNames('event_data').map(s => s.replace(/^#/, '')),
  common_props: allSheetNames('common_props').map(s => s.replace(/^#/, '')),
  user_data: allSheetNames('user_data').map(s => s.replace(/^#/, '')),
};

// MD 模板列标题多语言匹配 (simplified vs xlsx headers — no required markers, shorter names)
const MD_COL_EVENT_NAME =    ['事件名', 'Event Name', 'イベント名', '이벤트 이름'];
const MD_COL_DISPLAY_NAME =  ['显示名', 'Display Name', '表示名', '표시 이름', 'イベント表示名', '이벤트 표시 이름'];
const MD_COL_DESC =          ['说明', 'Description', '説明', '설명', 'イベント説明', '이벤트 설명'];
const MD_COL_TAG =           ['标签', 'Tag', 'タグ', '태그', 'カテゴリ', 'イベント 태그'];
const MD_COL_PLATFORM =      ['平台', 'Platform', 'プラットフォーム', '플랫폼'];
const MD_COL_PROP_NAME =     ['属性名', 'Property Name', 'プロパティ名', '속성 이름'];
const MD_COL_PROP =          ['属性', 'Properties', 'プロパティ', '속성'];
const MD_COL_TYPE =          ['类型', 'Type', 'タイプ', '유형', 'プロパティタイプ', '속성 유형'];
const MD_COL_UPDATE =        ['更新方式', 'Update Type', '更新方法', '업데이트 방식'];

/** 检查 trimmed line 是否匹配某 section 标题 */
function matchSection(trimmed: string, candidates: string[]): boolean {
  for (const c of candidates) {
    if (trimmed === `## ${c}`) return true;
  }
  return false;
}

/** 在 header map 中查找第一个匹配的列索引 */
function findCol(colIndex: Record<string, number>, candidates: string[], fallback: number): number {
  for (const c of candidates) {
    if (colIndex[c] !== undefined) return colIndex[c];
  }
  return fallback;
}

const VALID_UPDATE_TYPES = new Set<UpdateType>(['user_set', 'user_setOnce', 'user_add']);

function parseType(raw: string): PropType {
  const canonical = displayToType(raw);
  if (canonical) return canonical;
  return 'string' as PropType;
}

function parseUpdateType(raw: string): UpdateType {
  if (VALID_UPDATE_TYPES.has(raw as UpdateType)) return raw as UpdateType;
  return 'user_set' as UpdateType;
}

function trimCell(s: string | undefined | null): string {
  if (!s) return '';
  return s.trim();
}

/** Parse the ## {事件数据 | Event Data | ...} section */
function parseEventSection(lines: string[]): { events: Event[]; event_properties: Property[] } {
  const dataLines: string[][] = [];
  let inSection = false;
  let headerCols = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (matchSection(trimmed, MD_SECTIONS.event_data)) { inSection = true; continue; }
    if (trimmed.startsWith('## ') && inSection) break;
    if (!inSection) continue;
    if (trimmed.startsWith('|') && !trimmed.match(/^\|\s*---/)) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (headerCols === 0) headerCols = cells.length;
      dataLines.push(cells);
    }
  }

  if (dataLines.length < 2) return { events: [], event_properties: [] };

  const header = dataLines[0];
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => { if (h) colIndex[h] = i; });

  const eventNameCol = findCol(colIndex, MD_COL_EVENT_NAME, 0);
  const displayCol = findCol(colIndex, MD_COL_DISPLAY_NAME, 1);
  const descCol = findCol(colIndex, MD_COL_DESC, 2);
  const tagCol = findCol(colIndex, MD_COL_TAG, 3);
  const platformCol = findCol(colIndex, MD_COL_PLATFORM, 4);
  const propsCol = findCol(colIndex, MD_COL_PROP, 5);

  const eventsMap = new Map<string, Event>();
  const propsMap = new Map<string, Property>();
  const source: Source = 'template';

  for (let i = 2; i < dataLines.length; i++) {
    const cells = dataLines[i];
    if (cells.length < headerCols) continue;
    const eventName = trimCell(cells[eventNameCol]);
    if (!eventName) continue;
    const isIdent = (s: string) => /^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(s);
    if (!isIdent(eventName)) continue;

    const displayName = trimCell(cells[displayCol]);
    const eventDesc = trimCell(cells[descCol]);
    const eventTag = trimCell(cells[tagCol]);
    const platformRaw = trimCell(cells[platformCol]);
    const propNamesRaw = trimCell(cells[propsCol]);

    const evt: Event = {
      event_name: eventName,
      source,
      prop_names: [],
    };
    if (displayName) evt.display_name = displayName;
    if (eventDesc) evt.event_desc = eventDesc;
    if (eventTag) evt.event_tag = eventTag;
    if (platformRaw) {
      const normalized = platformRaw.toLowerCase();
      if (normalized === 'client' || normalized === 'server' || normalized === 'both') {
        evt.platform = normalized as Event['platform'];
      } else if (normalized.includes('client') && normalized.includes('server')) {
        evt.platform = 'both';
      }
    }

    const propNames = propNamesRaw
      ? propNamesRaw.split(',').map((p) => p.trim()).filter((p) => isIdent(p))
      : [];

    evt.prop_names = propNames;
    eventsMap.set(eventName, evt);

    for (const propName of propNames) {
      if (!propsMap.has(propName)) {
        propsMap.set(propName, { name: propName, type: 'string', source });
      }
    }
  }

  return {
    events: Array.from(eventsMap.values()),
    event_properties: Array.from(propsMap.values()),
  };
}

/** Parse the ## {公共事件属性 | Super Property | ...} section */
function parseCommonSection(lines: string[], source: Source): Property[] {
  const dataLines: string[][] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (matchSection(trimmed, MD_SECTIONS.common_props)) { inSection = true; continue; }
    if (trimmed.startsWith('## ') && inSection) break;
    if (!inSection) continue;
    if (trimmed.startsWith('|') && !trimmed.match(/^\|\s*---/)) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      dataLines.push(cells);
    }
  }

  if (dataLines.length < 2) return [];
  const header = dataLines[0];
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => { if (h) colIndex[h] = i; });

  const nameCol = findCol(colIndex, MD_COL_PROP_NAME, 0);
  const displayCol = findCol(colIndex, MD_COL_DISPLAY_NAME, 1);
  const typeCol = findCol(colIndex, MD_COL_TYPE, 2);
  const descCol = findCol(colIndex, MD_COL_DESC, 3);

  const props: Property[] = [];
  for (let i = 2; i < dataLines.length; i++) {
    const cells = dataLines[i];
    const name = trimCell(cells[nameCol]);
    if (!name || !/^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(name)) continue;
    props.push({
      name,
      type: parseType(trimCell(cells[typeCol])),
      source,
      display_name: trimCell(cells[displayCol]) || undefined,
      desc: trimCell(cells[descCol]) || undefined,
    });
  }
  return props;
}

/** Parse the ## {用户数据 | User Data | ...} section */
function parseUserSection(lines: string[], source: Source): UserProperty[] {
  const dataLines: string[][] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (matchSection(trimmed, MD_SECTIONS.user_data)) { inSection = true; continue; }
    if (trimmed.startsWith('#') && inSection) break;
    if (!inSection) continue;
    if (trimmed.startsWith('|') && !trimmed.match(/^\|\s*---/)) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      dataLines.push(cells);
    }
  }

  if (dataLines.length < 2) return [];
  const header = dataLines[0];
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => { if (h) colIndex[h] = i; });

  const nameCol = findCol(colIndex, MD_COL_PROP_NAME, 0);
  const displayCol = findCol(colIndex, MD_COL_DISPLAY_NAME, 1);
  const typeCol = findCol(colIndex, MD_COL_TYPE, 2);
  const updateCol = findCol(colIndex, MD_COL_UPDATE, 3);
  const descCol = findCol(colIndex, MD_COL_DESC, 4);
  const tagCol = findCol(colIndex, MD_COL_TAG, 5);

  const props: UserProperty[] = [];
  for (let i = 2; i < dataLines.length; i++) {
    const cells = dataLines[i];
    const name = trimCell(cells[nameCol]);
    if (!name || !/^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(name)) continue;
    const prop: UserProperty = {
      name,
      type: parseType(trimCell(cells[typeCol])),
      update_type: parseUpdateType(trimCell(cells[updateCol])),
      source,
    };
    const displayName = trimCell(cells[displayCol]);
    if (displayName) prop.display_name = displayName;
    const desc = trimCell(cells[descCol]);
    if (desc) prop.desc = desc;
    const tag = trimCell(cells[tagCol]);
    if (tag) prop.prop_tag = tag;
    props.push(prop);
  }
  return props;
}

/**
 * Parse a distilled MD template file into a Draft.
 */
export async function readTemplateMd(filePath: string): Promise<Draft> {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const source: Source = 'template';

  let planName = '';
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) { planName = m[1].trim(); break; }
  }

  const { events, event_properties } = parseEventSection(lines);
  const common_event_properties = parseCommonSection(lines, source);
  const user_properties = parseUserSection(lines, source);

  return {
    meta: {
      plan_name: planName,
      app_type: '',
      sdk_integration_mode: 'client_only',
    },
    events,
    event_properties,
    common_event_properties,
    user_properties,
  };
}

/** Synchronous version for when you already have the file content */
export function readTemplateMdSync(content: string): Draft {
  const lines = content.split('\n');
  const source: Source = 'template';

  let planName = '';
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) { planName = m[1].trim(); break; }
  }

  const { events, event_properties } = parseEventSection(lines);
  const common_event_properties = parseCommonSection(lines, source);
  const user_properties = parseUserSection(lines, source);

  return {
    meta: {
      plan_name: planName,
      app_type: '',
      sdk_integration_mode: 'client_only',
    },
    events,
    event_properties,
    common_event_properties,
    user_properties,
  };
}
