import ExcelJS from 'exceljs';
import type { Draft, PropType, UpdateType, EventPlatform } from '../plan/types.js';
import { type Locale, sheetName, headerName, typeToDisplay } from '../i18n/xlsx.js';
import { t } from '../i18n/translate.js';

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

  if (errors.length > 0) {
    throw new Error(`Draft validation failed:\n${errors.map(e => '  - ' + e).join('\n')}`);
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

  // AE 后端规则：同一事件跨多行时，事件名列（A-D）必须合并单元格，否则判重拒收。
  // 用 ExcelJS 的 mergeCells 实现；property-less 事件仍写一行，不合并。
  for (const evt of d.events) {
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
      }
    }
  }

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

  await workbook.xlsx.writeFile(outPath);
}
