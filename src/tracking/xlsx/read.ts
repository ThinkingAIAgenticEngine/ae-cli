import XLSXMod from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XLSX = (XLSXMod as any).default ?? XLSXMod;
import path from 'node:path';
import type { Draft, Event, EventPlatform, Property, UserProperty, PropType, UpdateType, Source } from '../plan/types.js';
import { allSheetNames, allHeaderNames, displayToType } from '../i18n/xlsx.js';
import { t } from '../i18n/translate.js';

const VALID_PROP_TYPES = new Set<PropType>(['string', 'number', 'bool', 'datetime', 'object', 'array_row', 'array_string']);
const VALID_UPDATE_TYPES = new Set<UpdateType>(['user_set', 'user_setOnce', 'user_add']);

/**
 * Normalize a header cell for comparison:
 * - Trim whitespace
 * - Strip （必填）/ (必填) /（必須）/ (필수) suffix (multi-language required markers)
 * - Normalize 名称 → 名 (e.g., 事件名称 → 事件名, 属性名称 → 属性名)
 */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/[（(]\s*(?:必填|必須|필수|required|Required)\s*[）)]/g, '')
    .trim()
    .replace(/名称$/g, '名');
}

type Row = (string | null)[];

/**
 * Build a header → column-index map from the header row.
 * Matching is done via normalizeHeader on both the stored header and the lookup key.
 * Also stores a positional fallback map for columns with empty/blank headers.
 */
function buildHeaderMap(headerRow: Row): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    if (cell === null || cell === undefined) return;
    const norm = normalizeHeader(String(cell));
    if (norm !== '') {
      map.set(norm, i);
    }
  });
  return map;
}

/**
 * Look up a column index by one or more candidate header names.
 * Returns the index of the first match, or -1 if none found.
 * The lookup normalizes all names before comparing.
 */
function colIdx(headerMap: Map<string, number>, ...candidates: string[]): number {
  for (const c of candidates) {
    const norm = normalizeHeader(c);
    if (headerMap.has(norm)) return headerMap.get(norm)!;
  }
  return -1;
}

function cellStr(row: Row, idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function parsePropType(raw: string, propName: string, sheetCtx: string): PropType {
  const canonical = displayToType(raw);
  if (canonical) return canonical;
  if (VALID_PROP_TYPES.has(raw as PropType)) return raw as PropType;
  process.stderr.write(
    `[read] unknown type "${raw}" on ${sheetCtx}:${propName}, defaulting to string\n`
  );
  return 'string';
}

function parseUpdateType(raw: string, propName: string): UpdateType {
  if (VALID_UPDATE_TYPES.has(raw as UpdateType)) return raw as UpdateType;
  process.stderr.write(
    `[xlsx/read] Warning: unknown update_type "${raw}" for user property "${propName}", falling back to "user_set"\n`
  );
  return 'user_set';
}

/** Skip rows that are entirely empty or whose first usable cell is not a valid identifier. */
function shouldSkipRow(row: Row, firstColIdx: number): boolean {
  const first = cellStr(row, firstColIdx);
  if (!first) return true;
  if (!/^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(first)) return true;
  return false;
}

// Parse #事件数据 sheet
// Official headers: "事件名（必填）", "事件显示名", "事件说明", "事件标签",
//                   "属性名（必填）", "属性显示名", "属性类型（必填）", "属性说明"
// Industry headers may have leading "事件模块" column, no （必填）, and empty event/prop name headers.
// For sheets where event name / prop name headers are blank (e.g., 电商), we fall back to
// the same column positions as the official template (0 and 4).
function parseEventSheet(
  rows: Row[],
  source: Source,
  sheetName: string,
): { events: Event[]; event_properties: Property[] } {
  const eventsMap = new Map<string, Event>();
  const propsMap = new Map<string, Property>();
  const eventsOrder: string[] = [];

  if (rows.length < 2) return { events: [], event_properties: [] };

  const headerRow = rows[0];
  const hMap = buildHeaderMap(headerRow);

  // Resolve columns — try all language header variants, then positional fallback
  let eventNameCol = colIdx(hMap, ...allHeaderNames('event_name'), '事件名称');
  let eventDisplayCol = colIdx(hMap, ...allHeaderNames('event_display_name'));
  let eventDescCol = colIdx(hMap, ...allHeaderNames('event_desc'));
  let eventTagCol = colIdx(hMap, ...allHeaderNames('event_tag'));
  let eventPlatformCol = colIdx(hMap, ...allHeaderNames('platform'));
  let propNameCol = colIdx(hMap, ...allHeaderNames('prop_name'), '属性名称');
  let propDisplayCol = colIdx(hMap, ...allHeaderNames('prop_display_name'));
  let propTypeCol = colIdx(hMap, ...allHeaderNames('prop_type'));
  let propDescCol = colIdx(hMap, ...allHeaderNames('prop_desc'));

  // For 电商 template: headers for event name, prop name, prop type are blank ("").
  // These columns have empty headers but the positional data is still correct.
  // Official template column order: 0=事件名, 1=事件显示名, 2=事件说明, 3=事件标签,
  //                                 4=属性名, 5=属性显示名, 6=属性类型, 7=属性说明
  // Industry templates with 事件模块 prefix: 0=模块, 1=事件名, 2=显示名, 3=说明, 4=标签
  //                                           5=属性名, 6=属性显示名, 7=属性类型, 8=属性说明
  // 电商 template: 0=事件名(blank header), 1=事件显示名, 2=事件说明, 3=事件标签,
  //                4=属性名(blank), 5=属性显示名, 6=属性类型(blank), 7=属性说明
  //
  // Strategy: if we found '事件显示名' but not '事件名', use the column to the left of '事件显示名'.
  if (eventNameCol === -1 && eventDisplayCol !== -1) {
    // The event name column is at eventDisplayCol - 1 if that column has an empty/null header
    const candidateCol = eventDisplayCol - 1;
    if (candidateCol >= 0) {
      const candidateHeader = headerRow[candidateCol];
      if (candidateHeader === null || candidateHeader === '' || candidateHeader === undefined) {
        eventNameCol = candidateCol;
      }
    }
  }
  // If still not found, fall back to col 0 or 1 based on whether 事件模块 is present
  if (eventNameCol === -1) {
    eventNameCol = hMap.has(normalizeHeader('事件模块')) ? 1 : 0;
  }

  // Similarly for prop name: look left of 属性显示名
  if (propNameCol === -1 && propDisplayCol !== -1) {
    const candidateCol = propDisplayCol - 1;
    if (candidateCol >= 0) {
      const candidateHeader = headerRow[candidateCol];
      if (candidateHeader === null || candidateHeader === '' || candidateHeader === undefined) {
        propNameCol = candidateCol;
      }
    }
  }

  // For prop type: look for a blank header between propDisplayCol and propDescCol
  if (propTypeCol === -1 && propDisplayCol !== -1 && propDescCol !== -1) {
    const candidateCol = propDescCol - 1;
    if (candidateCol > propDisplayCol) {
      const candidateHeader = headerRow[candidateCol];
      if (candidateHeader === null || candidateHeader === '' || candidateHeader === undefined) {
        propTypeCol = candidateCol;
      }
    }
  }

  // Last resort positional fallbacks
  if (propNameCol === -1) {
    // official: 4, industry with 事件模块: 4 (0-indexed: module, eventName, displayName, desc, tag, propName, ...)
    // So just check if there's a 事件模块 prefix
    propNameCol = hMap.has(normalizeHeader('事件模块')) ? 4 : 4;
  }
  if (propTypeCol === -1) {
    propTypeCol = hMap.has(normalizeHeader('事件模块')) ? 6 : 6;
  }

  const isIdent = (s: string) => /^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(s);
  let lastEventName = '';
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawEventName = cellStr(row, eventNameCol);
    const propName = propNameCol >= 0 ? cellStr(row, propNameCol) : '';

    // Skip completely empty rows
    if (!rawEventName && !propName) continue;

    // If event cell is non-empty but not a valid identifier, treat as prose and skip
    if (rawEventName && !isIdent(rawEventName)) continue;

    // If event cell empty but propName present, inherit last event (continuation row)
    const eventName = rawEventName || lastEventName;
    if (!eventName) continue; // continuation with no prior event — ignore

    const eventDisplayName = rawEventName && eventDisplayCol >= 0 ? cellStr(row, eventDisplayCol) : '';
    const eventDesc = rawEventName && eventDescCol >= 0 ? cellStr(row, eventDescCol) : '';
    const eventTag = rawEventName && eventTagCol >= 0 ? cellStr(row, eventTagCol) : '';
    const eventPlatformRaw = rawEventName && eventPlatformCol >= 0 ? cellStr(row, eventPlatformCol) : '';
    const propDisplayName = propDisplayCol >= 0 ? cellStr(row, propDisplayCol) : '';
    const propTypeRaw = propTypeCol >= 0 ? cellStr(row, propTypeCol) : '';
    const propDesc = propDescCol >= 0 ? cellStr(row, propDescCol) : '';

    if (rawEventName) lastEventName = rawEventName;

    // Parse platform: "client" -> "client", "server" -> "server", "client,server" -> "both", "客户端" -> "client", etc.
    function parsePlatform(raw: string): EventPlatform | undefined {
      if (!raw) return undefined;
      const normalized = raw.trim().toLowerCase();
      // English values
      if (normalized === 'client' || normalized === 'server' || normalized === 'both') {
        return normalized as EventPlatform;
      }
      // "client,server" or "server,client" -> both
      if (normalized.includes('client') && normalized.includes('server')) return 'both';
      // Chinese values
      if (normalized.includes('客户端') && normalized.includes('服务端')) return 'both';
      if (normalized.includes('服务端')) return 'server';
      if (normalized.includes('客户端')) return 'client';
      return undefined;
    }

    // Register event
    if (!eventsMap.has(eventName)) {
      const evt: Event = {
        event_name: eventName,
        source,
        prop_names: [],
      };
      if (eventDisplayName) evt.display_name = eventDisplayName;
      if (eventDesc) evt.event_desc = eventDesc;
      if (eventTag) evt.event_tag = eventTag;
      if (eventPlatformRaw) evt.platform = parsePlatform(eventPlatformRaw);
      eventsMap.set(eventName, evt);
      eventsOrder.push(eventName);
    }

    // Register property
    if (propName && /^[a-zA-Z#][a-zA-Z0-9_.]*$/.test(propName)) {
      const evt = eventsMap.get(eventName)!;
      if (!evt.prop_names.includes(propName)) {
        evt.prop_names.push(propName);
      }

      if (!propsMap.has(propName)) {
        const propType = parsePropType(propTypeRaw, propName, sheetName);
        const prop: Property = {
          name: propName,
          type: propType,
          source,
        };
        if (propDisplayName) prop.display_name = propDisplayName;
        if (propDesc) prop.desc = propDesc;
        propsMap.set(propName, prop);
      } else {
        // Check for type conflict
        const existing = propsMap.get(propName)!;
        const newType = parsePropType(propTypeRaw, propName, sheetName);
        if (propTypeRaw && existing.type !== newType) {
          process.stderr.write(
            `[xlsx/read] Warning: property "${propName}" has conflicting types: "${existing.type}" vs "${newType}". Keeping first.\n`
          );
        }
      }
    }
  }

  const events = eventsOrder.map((name) => eventsMap.get(name)!);
  const event_properties = Array.from(propsMap.values());
  return { events, event_properties };
}

// Parse #公共事件属性 sheet
// Official headers: "属性名（必填）", "属性显示名", "属性类型（必填）", "属性说明"
// Industry: may have leading "属性分类" column; no （必填）
// Also: 电商 has blank headers for 属性名 and 属性类型
function parseCommonEventSheet(rows: Row[], source: Source, sheetName: string): Property[] {
  const props: Property[] = [];
  const seen = new Set<string>();

  if (rows.length < 2) return props;

  const headerRow = rows[0];
  const hMap = buildHeaderMap(headerRow);

  let propNameCol = colIdx(hMap, ...allHeaderNames('common_prop_name'), '属性名称');
  const propDisplayCol = colIdx(hMap, ...allHeaderNames('common_prop_display_name'));
  let propTypeCol = colIdx(hMap, ...allHeaderNames('common_prop_type'));
  const propDescCol = colIdx(hMap, ...allHeaderNames('common_prop_desc'));

  // Fallback: look left of 属性显示名 for blank header (属性名)
  if (propNameCol === -1 && propDisplayCol !== -1) {
    const candidateCol = propDisplayCol - 1;
    if (candidateCol >= 0) {
      const h = headerRow[candidateCol];
      if (h === null || h === '' || h === undefined) propNameCol = candidateCol;
    }
  }
  if (propNameCol === -1) propNameCol = 0;

  // Fallback: look between propDisplayCol and propDescCol for blank header (属性类型)
  if (propTypeCol === -1 && propDisplayCol !== -1 && propDescCol !== -1) {
    const candidateCol = propDescCol - 1;
    if (candidateCol > propDisplayCol) {
      const h = headerRow[candidateCol];
      if (h === null || h === '' || h === undefined) propTypeCol = candidateCol;
    }
  }
  // For 电商: headers are ["", "属性显示名", "", "属性说明"] → type is at index 2
  if (propTypeCol === -1 && propDisplayCol !== -1) {
    // try propDisplayCol + 1 if blank
    const candidateCol = propDisplayCol + 1;
    if (candidateCol < headerRow.length) {
      const h = headerRow[candidateCol];
      if (h === null || h === '' || h === undefined) propTypeCol = candidateCol;
    }
  }
  if (propTypeCol === -1) propTypeCol = 2;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (shouldSkipRow(row, propNameCol)) continue;

    const name = cellStr(row, propNameCol);
    const displayName = propDisplayCol >= 0 ? cellStr(row, propDisplayCol) : '';
    const typeRaw = cellStr(row, propTypeCol);
    const desc = propDescCol >= 0 ? cellStr(row, propDescCol) : '';

    if (seen.has(name)) continue;
    seen.add(name);

    const prop: Property = {
      name,
      type: parsePropType(typeRaw, name, sheetName),
      source,
    };
    if (displayName) prop.display_name = displayName;
    if (desc) prop.desc = desc;
    props.push(prop);
  }

  return props;
}

// Parse #用户数据 sheet
// Official headers: "属性名（必填）", "属性显示名", "属性类型（必填）", "更新方式（必填）", "属性说明", "属性标签"
// Industry: may have leading "属性分类" column; no （必填）
// 电商: blank headers for 属性名 and 属性类型
function parseUserDataSheet(rows: Row[], source: Source, sheetName: string): UserProperty[] {
  const props: UserProperty[] = [];
  const seen = new Set<string>();

  if (rows.length < 2) return props;

  const headerRow = rows[0];
  const hMap = buildHeaderMap(headerRow);

  let propNameCol = colIdx(hMap, ...allHeaderNames('user_prop_name'), '属性名称');
  const propDisplayCol = colIdx(hMap, ...allHeaderNames('user_prop_display_name'));
  let propTypeCol = colIdx(hMap, ...allHeaderNames('user_prop_type'));
  const updateTypeCol = colIdx(hMap, ...allHeaderNames('update_type'));
  const propDescCol = colIdx(hMap, ...allHeaderNames('user_prop_desc'));
  const propTagCol = colIdx(hMap, ...allHeaderNames('prop_tag'));

  // Fallback for blank-header columns (电商 style)
  if (propNameCol === -1 && propDisplayCol !== -1) {
    const candidateCol = propDisplayCol - 1;
    if (candidateCol >= 0) {
      const h = headerRow[candidateCol];
      if (h === null || h === '' || h === undefined) propNameCol = candidateCol;
    }
  }
  if (propNameCol === -1) propNameCol = 0;

  // For type: look between propDisplayCol and updateTypeCol for blank
  if (propTypeCol === -1 && propDisplayCol !== -1 && updateTypeCol !== -1) {
    const candidateCol = updateTypeCol - 1;
    if (candidateCol > propDisplayCol) {
      const h = headerRow[candidateCol];
      if (h === null || h === '' || h === undefined) propTypeCol = candidateCol;
    }
  }
  if (propTypeCol === -1) propTypeCol = 2;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (shouldSkipRow(row, propNameCol)) continue;

    const name = cellStr(row, propNameCol);
    const displayName = propDisplayCol >= 0 ? cellStr(row, propDisplayCol) : '';
    const typeRaw = cellStr(row, propTypeCol);
    const updateTypeRaw = updateTypeCol >= 0 ? cellStr(row, updateTypeCol) : '';
    const desc = propDescCol >= 0 ? cellStr(row, propDescCol) : '';
    const propTag = propTagCol >= 0 ? cellStr(row, propTagCol) : '';

    if (seen.has(name)) continue;
    seen.add(name);

    const prop: UserProperty = {
      name,
      type: parsePropType(typeRaw, name, sheetName),
      update_type: parseUpdateType(updateTypeRaw, name),
      source,
    };
    if (displayName) prop.display_name = displayName;
    if (desc) prop.desc = desc;
    if (propTag) prop.prop_tag = propTag;
    props.push(prop);
  }

  return props;
}

/**
 * Fill down merged cell values in a 2D row array using worksheet merge info.
 * SheetJS returns null for non-top-left cells in merged ranges.
 * This function propagates the top-left value to all cells in each merge range.
 */
function fillDownMergedCells(
  rows: Row[],
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>,
): void {
  for (const merge of merges) {
    const { s, e } = merge;
    const topLeftValue = rows[s.r]?.[s.c];
    if (topLeftValue === null || topLeftValue === undefined) continue;
    for (let r = s.r; r <= e.r; r++) {
      if (!rows[r]) continue;
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue; // skip top-left
        if (rows[r][c] === null || rows[r][c] === undefined) {
          rows[r][c] = topLeftValue;
        }
      }
    }
  }
}

export async function readTemplateXlsx(filePath: string): Promise<Draft> {
  let wb: ReturnType<typeof XLSX.readFile>;
  try {
    wb = XLSX.readFile(filePath);
  } catch (err) {
    throw new Error(t('error.xlsx_read_failed', { path: filePath, error: String(err) }));
  }

  const planName = path.basename(filePath, path.extname(filePath));
  const source: Source = 'template';

  let events: Event[] = [];
  let event_properties: Property[] = [];
  let common_event_properties: Property[] = [];
  let user_properties: UserProperty[] = [];

  for (const sName of wb.SheetNames as string[]) {
    if (!sName.startsWith('#')) continue; // skip non-data sheets

    // #用户ID体系 / #ID mapping rule / ... — skip
    if (allSheetNames('user_id').includes(sName)) continue;

    const ws = (wb.Sheets as Record<string, unknown>)[sName];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: null,
    }) as Row[];

    // Fill down merged cell values (SheetJS returns null for non-top-left cells)
    const merges = (ws as Record<string, unknown>)['!merges'] as
      | Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>
      | undefined;
    if (merges && merges.length > 0) {
      fillDownMergedCells(rows, merges);
    }

    if (allSheetNames('event_data').includes(sName)) {
      const result = parseEventSheet(rows, source, sName);
      events = result.events;
      event_properties = result.event_properties;
    } else if (allSheetNames('common_props').includes(sName)) {
      common_event_properties = parseCommonEventSheet(rows, source, sName);
    } else if (allSheetNames('user_data').includes(sName)) {
      user_properties = parseUserDataSheet(rows, source, sName);
    }
    // any other # sheets: ignore
  }

  return {
    meta: {
      app_type: '',
      sdk_integration_mode: 'client_only',
      plan_name: planName,
    },
    events,
    event_properties,
    common_event_properties,
    user_properties,
  };
}
