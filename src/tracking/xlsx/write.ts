import ExcelJS from 'exceljs';
import type { Draft, PropType, UpdateType, EventPlatform, Event, Property } from '../plan/types.js';
import { type Locale, sheetName, headerName, typeToDisplay } from '../i18n/xlsx.js';
import { t } from '../i18n/translate.js';
import { getTagPriority } from './tag-priority.js';

// EventPlatform → xlsx value（始终用英文 canonical，各语言通用）
const PLATFORM_TO_XLSX: Record<EventPlatform, string> = {
  'client': 'client',
  'server': 'server',
  'both': 'client,server',
};

const VALID_PROP_TYPES = new Set<PropType>(['string', 'number', 'bool', 'datetime', 'object', 'array_row', 'array_string']);
const VALID_UPDATE_TYPES = new Set<UpdateType>(['user_set', 'user_setOnce', 'user_add']);
const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;
const PROP_NAME_RE = /^[a-zA-Z#][a-zA-Z0-9_.]*$/;

// ---- Column width helpers ----

const MIN_COL_WIDTH = 10;
const PADDING = 3;

/** Quick check: is this codepoint a wide (CJK/fullwidth) character? */
function isWideChar(code: number): boolean {
  return (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) || // CJK Ext-A
    (code >= 0x3040 && code <= 0x309F) || // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) || // Katakana
    (code >= 0xAC00 && code <= 0xD7AF) || // Hangul
    (code >= 0xFF00 && code <= 0xFFEF); // Fullwidth forms
}

/** Approximate display width: CJK/fullwidth ≈ 2, ASCII ≈ 1 */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += isWideChar(ch.charCodeAt(0)) ? 2 : 1;
  }
  return w;
}

/**
 * Auto-fit column widths for a worksheet.
 *
 * Each column is sized to its longest cell, capped at `maxWidth`.
 * Columns whose content exceeds the cap get wrapText alignment.
 *
 * @param maxWidth  Default 55 — description columns benefit from a wider cap.
 *                  Pass a smaller value for type/short columns (e.g. 22).
 */
function autoFitSheet(ws: ExcelJS.Worksheet, maxWidth: number = 55): void {
  const colCount = ws.columnCount;
  if (colCount === 0) return;
  for (let i = 1; i <= colCount; i++) {
    const col = ws.getColumn(i);
    let maxDisplay = 0;
    let needsWrap = false;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const text = String(cell.value ?? '');
      if (!text) return;
      const dw = displayWidth(text);
      if (dw > maxDisplay) maxDisplay = dw;
    });
    if (maxDisplay === 0) {
      col.width = MIN_COL_WIDTH;
      continue;
    }
    const capped = maxDisplay + PADDING > maxWidth;
    col.width = Math.max(MIN_COL_WIDTH, Math.min(maxWidth, maxDisplay + PADDING));
    if (capped) {
      col.eachCell({ includeEmpty: false }, (cell) => {
        cell.alignment = { ...cell.alignment, wrapText: true };
      });
    }
  }
}

export function validateDraft(d: Draft): void {
  const errors: string[] = [];

  // Validate event names
  const eventNames = new Set<string>();
  for (const evt of d.events) {
    if (!SNAKE_CASE_RE.test(evt.event_name)) {
      errors.push(`Event name "${evt.event_name}" does not match snake_case pattern`);
    }
    if (eventNames.has(evt.event_name)) {
      errors.push(`Duplicate event_name: "${evt.event_name}"`);
    }
    eventNames.add(evt.event_name);
  }

  // Validate event_properties
  const eventProps = d.event_properties ?? (d as any).common_properties ?? [];
  const eventPropNames = new Set<string>();
  const compositeProps = new Set<string>(
    eventProps.filter(p => p.type === 'array_row' || p.type === 'object').map(p => p.name)
  );
  for (const prop of eventProps) {
    if (!PROP_NAME_RE.test(prop.name)) {
      errors.push(`Event property name "${prop.name}" has invalid characters`);
    }
    // Allow nested: parent.child where parent is a composite type (object / array_row)
    if (prop.name.includes('.')) {
      const parent = prop.name.split('.')[0];
      if (!compositeProps.has(parent)) {
        errors.push(`Nested property "${prop.name}" references non-composite parent "${parent}"`);
      }
    }
    if (!VALID_PROP_TYPES.has(prop.type)) {
      errors.push(`Event property "${prop.name}" has invalid type: "${prop.type}"`);
    }
    if (eventPropNames.has(prop.name)) {
      errors.push(`Duplicate event property name: "${prop.name}"`);
    }
    eventPropNames.add(prop.name);
  }

  // Validate common_event_properties
  const commonProps = d.common_event_properties ?? (d as any).common_properties ?? [];
  const commonPropNames = new Set<string>();
  for (const prop of commonProps) {
    if (!VALID_PROP_TYPES.has(prop.type)) {
      errors.push(`Common event property "${prop.name}" has invalid type: "${prop.type}"`);
    }
    if (commonPropNames.has(prop.name)) {
      errors.push(`Duplicate common event property name: "${prop.name}"`);
    }
    commonPropNames.add(prop.name);
  }

  // Validate user_properties
  const userPropNames = new Set<string>();
  for (const prop of d.user_properties) {
    if (!VALID_PROP_TYPES.has(prop.type)) {
      errors.push(`User property "${prop.name}" has invalid type: "${prop.type}"`);
    }
    if (prop.update_type && !VALID_UPDATE_TYPES.has(prop.update_type)) {
      errors.push(`User property "${prop.name}" has invalid update_type: "${prop.update_type}"`);
    }
    if (userPropNames.has(prop.name)) {
      errors.push(`Duplicate user property name: "${prop.name}"`);
    }
    userPropNames.add(prop.name);
  }

  // Validate event.prop_names reference existing event_properties
  // Skip preset properties (starting with #) — they're auto-collected by SDK
  for (const evt of d.events) {
    if (!evt.prop_names) continue; // 旧版 draft 格式，无 prop_names
    for (const propName of evt.prop_names) {
      if (propName.startsWith('#')) continue; // SDK 预置属性，无需在池中定义
      if (!eventPropNames.has(propName)) {
        errors.push(`Event "${evt.event_name}" references unknown event property "${propName}"`);
      }
    }
  }

  // === 新增规则 ===

  // 规则 1: 显示名必须唯一（同一属性池内）
  // event_properties 池内显示名唯一
  const eventDisplayNames = new Map<string, string[]>();
  for (const prop of eventProps) {
    if (prop.display_name) {
      const names = eventDisplayNames.get(prop.display_name) || [];
      names.push(prop.name);
      eventDisplayNames.set(prop.display_name, names);
    }
  }
  for (const [displayName, names] of eventDisplayNames) {
    if (names.length > 1) {
      errors.push(`Display name "${displayName}" is used by multiple event properties: ${names.join(', ')}`);
    }
  }

  // common_event_properties 池内显示名唯一
  const commonDisplayNames = new Map<string, string[]>();
  for (const prop of commonProps) {
    if (prop.display_name) {
      const names = commonDisplayNames.get(prop.display_name) || [];
      names.push(prop.name);
      commonDisplayNames.set(prop.display_name, names);
    }
  }
  for (const [displayName, names] of commonDisplayNames) {
    if (names.length > 1) {
      errors.push(`Display name "${displayName}" is used by multiple common properties: ${names.join(', ')}`);
    }
  }

  // user_properties 池内显示名唯一
  const userDisplayNames = new Map<string, string[]>();
  for (const prop of d.user_properties) {
    if (prop.display_name) {
      const names = userDisplayNames.get(prop.display_name) || [];
      names.push(prop.name);
      userDisplayNames.set(prop.display_name, names);
    }
  }
  for (const [displayName, names] of userDisplayNames) {
    if (names.length > 1) {
      errors.push(`Display name "${displayName}" is used by multiple user properties: ${names.join(', ')}`);
    }
  }

  // 规则 2: 复合类型（对象/对象组）子属性必须一致
  // 收集每个 composite 父属性的所有子属性
  const compositeChildren = new Map<string, Set<string>>();
  for (const prop of eventProps) {
    if (prop.type === 'array_row' || prop.type === 'object') {
      compositeChildren.set(prop.name, new Set());
    }
  }
  for (const prop of eventProps) {
    if (prop.name.includes('.')) {
      const parent = prop.name.split('.')[0];
      const children = compositeChildren.get(parent);
      if (children) {
        children.add(prop.name);
      }
    }
  }

  // 检查每个事件引用的 composite 子属性是否一致
  for (const evt of d.events) {
    if (!evt.prop_names) continue;
    for (const parentName of compositeProps) {
      if (evt.prop_names.includes(parentName)) {
        const eventChildren = evt.prop_names.filter(p => p.startsWith(parentName + '.'));
        const expectedChildren = compositeChildren.get(parentName);
        if (expectedChildren && eventChildren.length > 0) {
          for (const child of expectedChildren) {
            if (!eventChildren.includes(child)) {
              errors.push(`Event "${evt.event_name}" uses "${parentName}" but missing child "${child}"`);
            }
          }
        }
      }
    }
  }

  // 规则 3: 复合类型子属性类型必须一致
  // 同一个子属性名（如 items.price）在不同事件中类型必须相同
  const childPropTypes = new Map<string, { type: PropType; events: string[] }>();
  for (const prop of eventProps) {
    if (prop.name.includes('.')) {
      const childName = prop.name;
      const existing = childPropTypes.get(childName);
      if (existing) {
        if (existing.type !== prop.type) {
          errors.push(`Child property "${childName}" has inconsistent types: "${existing.type}" vs "${prop.type}" (used in events: ${existing.events.join(', ')})`);
        }
      } else {
        childPropTypes.set(childName, { type: prop.type, events: [] });
      }
    }
  }

  // 规则 4: 对象/对象组必须至少有一个子属性
  // 规则 5: 复合类型（对象/对象组）的子属性只能是标量或 array_string，不能是 object/array_row
  validateCompositeRules(eventProps, 'Event property', errors);
  validateCompositeRules(d.user_properties, 'User property', errors);

  if (errors.length > 0) {
    throw new Error(`Draft validation failed:\n${errors.map(e => '  - ' + e).join('\n')}`);
  }
}

/**
 * Composite-type (object/array_row) shape rules shared by the event and user property pools:
 * a composite parent must have at least one `parent.child` child, and every child of a composite
 * parent must be scalar or array_string — a nested object/object-array has to be flattened further.
 */
function validateCompositeRules(props: Property[], poolLabel: string, errors: string[]): void {
  const composite = new Set<string>(
    props.filter((prop) => prop.type === 'array_row' || prop.type === 'object').map((prop) => prop.name),
  );
  for (const parent of composite) {
    if (!props.some((prop) => prop.name.startsWith(`${parent}.`))) {
      errors.push(`${poolLabel} "${parent}" has no child properties (object/array_row require at least one child).`);
    }
  }
  for (const prop of props) {
    if (!prop.name.includes('.')) continue;
    const parent = prop.name.split('.')[0];
    if (composite.has(parent) && (prop.type === 'object' || prop.type === 'array_row')) {
      errors.push(`${poolLabel} "${prop.name}" has type "${prop.type}"; composite children must be scalar or array_string (flatten nested objects/arrays further).`);
    }
  }
}

export async function writeDraftXlsx(d: Draft, outPath: string, locale: Locale = 'zh'): Promise<void> {
  validateDraft(d);

  const workbook = new ExcelJS.Workbook();

  // === Sheet: #事件数据 ===
  const eventSheet = workbook.addWorksheet(sheetName('event_data', locale));
  eventSheet.addRow([
    headerName('event_name', locale),
    headerName('event_display_name', locale),
    headerName('event_desc', locale),
    headerName('event_tag', locale),
    headerName('platform', locale),
    headerName('prop_name', locale),
    headerName('prop_display_name', locale),
    headerName('prop_type', locale),
    headerName('prop_desc', locale),
  ]);

  // Build a prop map for quick lookup
  const propByName = new Map(d.event_properties.map(p => [p.name, p]));

  // Group events by event_tag for ordered output.
  // Autotrack (SDK auto-collected) events first, then business events
  // grouped by tag, ordered by business importance:
  // Basic → core gameplay → monetization → supporting → genre-specific → non-game.
  const autotrackEvents: Event[] = d.events.filter(e => e.source === 'autotrack');
  const businessEvents: Event[] = d.events.filter(e => e.source !== 'autotrack');
  const tagGroups = new Map<string, Event[]>();
  const tagOrder: string[] = [];
  for (const evt of businessEvents) {
    const tag = evt.event_tag || '';
    if (!tagGroups.has(tag)) { tagGroups.set(tag, []); tagOrder.push(tag); }
    tagGroups.get(tag)!.push(evt);
  }
  tagOrder.sort((a, b) => getTagPriority(a) - getTagPriority(b));
  const sorted: Event[] = [...autotrackEvents];
  for (const tag of tagOrder) {
    for (const evt of tagGroups.get(tag)!) { sorted.push(evt); }
  }

  // AE 后端规则：同一事件跨多行时，事件名列（A-E）必须合并单元格，否则判重拒收。
  // 用 ExcelJS 的 mergeCells 实现；property-less 事件仍写一行，不合并。
  for (const evt of sorted) {
    const startRow = eventSheet.rowCount + 1;
    const platformStr = evt.platform ? PLATFORM_TO_XLSX[evt.platform] : '';
    if (evt.prop_names.length === 0) {
      eventSheet.addRow([
        evt.event_name,
        evt.display_name ?? '',
        evt.event_desc ?? '',
        evt.event_tag ?? '',
        platformStr,
        '', '', '', '',
      ]);
    } else {
      for (const propName of evt.prop_names) {
        const prop = propByName.get(propName);
        eventSheet.addRow([
          evt.event_name,
          evt.display_name ?? '',
          evt.event_desc ?? '',
          evt.event_tag ?? '',
          platformStr,
          prop?.name ?? propName,
          prop?.display_name ?? '',
          prop ? typeToDisplay(prop.type, locale) : '',
          prop?.desc ?? '',
        ]);
      }
      const endRow = eventSheet.rowCount;
      if (endRow > startRow) {
        // Merge columns A-E across all rows of this event
        for (const col of ['A', 'B', 'C', 'D', 'E']) {
          eventSheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
        }
        // Center merged cells vertically
        for (let r = startRow; r <= endRow; r++) {
          const row = eventSheet.getRow(r);
          for (const col of ['A', 'B', 'C', 'D', 'E']) {
            const cell = row.getCell(col);
            cell.alignment = { ...cell.alignment, vertical: 'middle' };
          }
        }
      }
    }
  }
  autoFitSheet(eventSheet, 50);

  // === Sheet: #公共事件属性 ===
  const commonSheet = workbook.addWorksheet(sheetName('common_props', locale));
  commonSheet.addRow([
    headerName('common_prop_name', locale),
    headerName('common_prop_display_name', locale),
    headerName('common_prop_type', locale),
    headerName('common_prop_desc', locale),
  ]);
  for (const prop of d.common_event_properties) {
    commonSheet.addRow([
      prop.name,
      prop.display_name ?? '',
      typeToDisplay(prop.type, locale),
      prop.desc ?? '',
    ]);
  }
  autoFitSheet(commonSheet, 50);

  // === Sheet: #用户数据 ===
  const userSheet = workbook.addWorksheet(sheetName('user_data', locale));
  userSheet.addRow([
    headerName('user_prop_name', locale),
    headerName('user_prop_display_name', locale),
    headerName('user_prop_type', locale),
    headerName('update_type', locale),
    headerName('user_prop_desc', locale),
    headerName('prop_tag', locale),
  ]);
  for (const prop of d.user_properties) {
    userSheet.addRow([
      prop.name,
      prop.display_name ?? '',
      typeToDisplay(prop.type, locale),
      prop.update_type ?? 'user_set', // 默认 user_set
      prop.desc ?? '',
      prop.prop_tag ?? '',
    ]);
  }
  autoFitSheet(userSheet, 50);

  // #用户ID体系 — AE 后端要求此 sheet 至少有 #account_id 和 #distinct_id 两行数据。
  const userIdSheet = workbook.addWorksheet(sheetName('user_id', locale));
  userIdSheet.addRow([
    headerName('user_id_prop_name', locale),
    headerName('user_id_display_name', locale),
    headerName('user_id_desc', locale),
    headerName('user_id_value_desc', locale),
  ]);
  userIdSheet.addRow(['#account_id', t('user_id.account_id_display', {}, locale), t('user_id.system_property', {}, locale), t('user_id.set_to', { field: d.meta.user_identity?.account_id_field ?? 'account ID' }, locale)]);
  userIdSheet.addRow(['#distinct_id', t('user_id.distinct_id_display', {}, locale), t('user_id.system_property', {}, locale), t('user_id.auto_generated', {}, locale)]);
  autoFitSheet(userIdSheet, 50);

  await workbook.xlsx.writeFile(outPath);
}
