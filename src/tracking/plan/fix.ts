import type { Draft, Property } from './types.js';
import { t } from '../i18n/translate.js';

/**
 * 埋点方案自动修复
 * 根据 AE API 返回的错误自动修复 draft.json
 */

export interface TEUploadError {
  errorType: string;
  errorTypeDesc: string;
  cellName: string;
  row: number;
  value: string;
}

export interface TEUploadResponse {
  return_code: number;
  return_message: string;
  data?: {
    eventErrorMap?: Record<string, TEUploadError[]>;
    userErrorMap?: Record<string, TEUploadError[]>;
  };
}

/**
 * 从 AE API 响应中提取错误
 */
export function extractErrors(response: TEUploadResponse): TEUploadError[] {
  const errors: TEUploadError[] = [];
  if (response.data?.eventErrorMap) {
    for (const [errorType, items] of Object.entries(response.data.eventErrorMap)) {
      for (const item of items) {
        errors.push({ ...item, errorType });
      }
    }
  }
  if (response.data?.userErrorMap) {
    for (const [errorType, items] of Object.entries(response.data.userErrorMap)) {
      for (const item of items) {
        errors.push({ ...item, errorType });
      }
    }
  }
  return errors;
}

/**
 * 修复显示名重复错误
 */
function fixDisplayDuplicate(draft: Draft, errors: TEUploadError[]): void {
  // 收集重复的显示名
  const duplicateDisplayNames = new Map<string, string[]>();
  for (const error of errors) {
    if (error.errorType === 'event_prop_display_duplicate') {
      const names = duplicateDisplayNames.get(error.value) || [];
      names.push(error.value);
      duplicateDisplayNames.set(error.value, names);
    }
  }

  // 修复：给重复的显示名添加区分前缀
  for (const prop of draft.event_properties) {
    if (duplicateDisplayNames.has(prop.display_name || '')) {
      // 找到这个属性在哪些事件中被引用
      const eventsUsingProp = draft.events.filter(e => e.prop_names.includes(prop.name));

      // 根据属性类型添加前缀
      if (prop.name.includes('.')) {
        // 子属性：添加"明细"前缀
        prop.display_name = `明细${prop.display_name}`;
      } else if (eventsUsingProp.length > 0) {
        // 根据事件类型添加前缀
        prop.display_name = `${prop.display_name}${t('fix.detail_suffix')}`;
      }
    }
  }
}

/**
 * 修复对象组子属性不一致
 */
function fixArrayRowConsistency(draft: Draft, errors: TEUploadError[]): void {
  // 收集每个复合类型（对象/对象组）的完整子属性
  const compositeChildren = new Map<string, string[]>();
  const evProps = draft.event_properties ?? (draft as any).common_properties ?? [];
  for (const prop of evProps) {
    if (prop.type === 'array_row' || prop.type === 'object') {
      compositeChildren.set(prop.name, []);
    }
  }
  for (const prop of evProps) {
    if (prop.name.includes('.')) {
      const parent = prop.name.split('.')[0];
      const children = compositeChildren.get(parent);
      if (children) {
        children.push(prop.name);
      }
    }
  }

  // 对每个事件，确保引用的复合类型包含完整子属性
  for (const event of draft.events) {
    if (!event.prop_names) continue;
    const propNamesSet = new Set(event.prop_names);

    for (const [parentName, children] of compositeChildren) {
      if (propNamesSet.has(parentName)) {
        // 检查是否包含所有子属性
        for (const child of children) {
          if (!propNamesSet.has(child)) {
            event.prop_names.push(child);
          }
        }

        // 重新排序：先父属性，再子属性（按顺序）
        const parentProps = event.prop_names.filter(p =>
          p === parentName || p.startsWith(parentName + '.')
        );
        const sorted = [parentName, ...children.filter(c => event.prop_names.includes(c))];

        event.prop_names = event.prop_names.filter(p =>
          !p.startsWith(parentName) || p === parentName
        );

        const idx = event.prop_names.indexOf(parentName);
        if (idx >= 0) {
          event.prop_names.splice(idx, 1, ...sorted);
        }
      }
    }
  }
}

/**
 * 修复未知属性引用（内部校验用，无需 API 响应）
 * 移除事件中引用但不在 event_properties 池中的属性名（预置属性 # 开头除外）
 */
function fixUnknownPropRefs(draft: Draft): string[] {
  const fixed: string[] = [];
  const props = draft.event_properties ?? (draft as any).common_properties ?? [];
  const eventPropNames = new Set(props.map(p => p.name));

  for (const event of draft.events) {
    if (!event.prop_names) continue; // 旧版 draft 格式，无 prop_names
    const removed: string[] = [];
    event.prop_names = event.prop_names.filter(pn => {
      if (pn.startsWith('#')) return true; // SDK 预置属性，无需在池中定义
      if (eventPropNames.has(pn)) return true;
      removed.push(pn);
      return false;
    });
    if (removed.length > 0) {
      fixed.push(...removed.map(r => `Removed unknown prop "${r}" from event "${event.event_name}"`));
    }
  }

  return fixed;
}

/**
 * 修复同一属性池内显示名重复（内部校验用，无需 API 响应）
 * 对重复的 display_name，第一个保留原名，后续追加 " (prop_name)"
 */
function fixDisplayNameDuplicates(draft: Draft): string[] {
  const fixed: string[] = [];

  const pools: { name: string; items: Property[] }[] = [
    { name: 'event_properties', items: draft.event_properties ?? (draft as any).common_properties ?? [] },
    { name: 'common_event_properties', items: draft.common_event_properties ?? (draft as any).common_properties ?? [] },
    { name: 'user_properties', items: draft.user_properties ?? [] },
  ];

  for (const pool of pools) {
    const displayMap = new Map<string, number[]>();
    for (let i = 0; i < pool.items.length; i++) {
      const dn = pool.items[i].display_name;
      if (!dn) continue; // 跳过空显示名
      const list = displayMap.get(dn) || [];
      list.push(i);
      displayMap.set(dn, list);
    }

    for (const [displayName, indices] of displayMap) {
      if (indices.length <= 1) continue;
      // 第一个保留原名，后续追加 " (prop_name)"
      for (let j = 1; j < indices.length; j++) {
        const prop = pool.items[indices[j]];
        const newDisplayName = `${displayName} (${prop.name})`;
        prop.display_name = newDisplayName;
        fixed.push(`Disambiguated display name "${displayName}" → "${newDisplayName}" in ${pool.name}`);
      }
    }
  }

  return fixed;
}

/**
 * 修复跨属性池 display_name 不一致（内部校验用，无需 API 响应）
 * 同一个 name 在 event_properties 和 common_event_properties 中出现时，display_name 必须一致。
 * 优先采用 common_event_properties 的 display_name（作为全局定义）。
 */
function fixCrossPoolDisplayNameInconsistency(draft: Draft): string[] {
  const fixed: string[] = [];
  const commonProps = draft.common_event_properties ?? [];
  const eventProps = draft.event_properties ?? [];

  for (const cp of commonProps) {
    if (!cp.display_name) continue;
    const ep = eventProps.find(p => p.name === cp.name);
    if (!ep) continue;
    if (ep.display_name && ep.display_name !== cp.display_name) {
      const oldName = ep.display_name;
      ep.display_name = cp.display_name;
      fixed.push(
        `Aligned display_name for "${cp.name}" in event_properties: "${oldName}" → "${cp.display_name}" (from common_event_properties)`
      );
    }
  }
  return fixed;
}

/**
 * 根据 sdk_integration_mode 自动填充事件的 platform 字段
 * - client_only → 全部设为 "client"
 * - server_only → 全部设为 "server"
 * - both / none → 不自动填充（需用户手动指定）
 */
function fixEventPlatforms(draft: Draft): string[] {
  const fixed: string[] = [];
  const mode = draft.meta.sdk_integration_mode;
  if (mode !== 'client_only' && mode !== 'server_only') return fixed;
  const targetPlatform = mode === 'client_only' ? 'client' : 'server';
  let count = 0;
  for (const event of draft.events) {
    if (!event.platform) {
      event.platform = targetPlatform;
      count++;
    }
  }
  if (count > 0) {
    fixed.push(
      `Auto-filled platform="${targetPlatform}" for ${count} event(s) based on sdk_integration_mode="${mode}"`
    );
  }
  return fixed;
}

/**
 * 修复事件属性名不合法（转为 snake_case）
 * 将驼峰命名如 Identity/userID/VIPLevel 转为 snake_case
 */
function fixEventPropNameInvalid(draft: Draft, errors: TEUploadError[]): void {
  const invalidNames = new Set<string>();
  for (const error of errors) {
    if (error.errorType === 'event_prop_name_invalid') {
      invalidNames.add(error.value);
    }
  }

  for (const prop of draft.event_properties) {
    if (invalidNames.has(prop.name)) {
      // 转换为 snake_case
      // 1. 小写+大写：userID → user_ID
      // 2. 大写+小写+大写：VIPLevel → VIP_Level → vip_level
      // 3. 连续大写+小写：HTTPResponse → HTTP_Response → http_response
      const fixedName = prop.name
        .replace(/([a-z])([A-Z])/g, '$1_$2')           // 小写+大写 → user_ID
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')     // 连续大写+大写小写 → VIP_Level
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')      // 单大写+大写小写 → ID_Response
        .toLowerCase();
      const oldName = prop.name;
      prop.name = fixedName;

      // 更新所有事件中引用该属性的地方
      for (const event of draft.events) {
        const idx = event.prop_names.indexOf(oldName);
        if (idx >= 0) {
          event.prop_names[idx] = fixedName;
        }
      }

      // 更新显示名（如果之前没有自定义后缀，加上说明）
      if (prop.display_name && !prop.display_name.includes('(')) {
        prop.display_name = `${prop.display_name}${t('fix.auto_fix_suffix')}`;
      }
    }
  }
}

/**
 * 修复事件名重复
 */
function fixEventNameDuplicate(draft: Draft, errors: TEUploadError[]): void {
  const duplicateEvents = new Set<string>();
  for (const error of errors) {
    if (error.errorType === 'event_name_duplicate') {
      duplicateEvents.add(error.value);
    }
  }

  // 移除重复的事件（保留第一个）
  const seen = new Set<string>();
  draft.events = draft.events.filter(event => {
    if (duplicateEvents.has(event.event_name)) {
      if (seen.has(event.event_name)) {
        return false; // 移除后续重复
      }
      seen.add(event.event_name);
    }
    return true;
  });
}

/**
 * 自动修复 draft.json
 */
export function fixDraft(draft: Draft, response: TEUploadResponse): string[] {
  const errors = extractErrors(response);
  const fixed: string[] = [];

  if (errors.length === 0) {
    return fixed;
  }

  // 按错误类型分类
  const errorTypes = new Set(errors.map(e => e.errorType));

  // 修复显示名重复
  if (errorTypes.has('event_prop_display_duplicate')) {
    fixDisplayDuplicate(draft, errors);
    fixed.push(t('fix.display_name_dedup'));
  }

  // 修复对象组子属性不一致
  if (errorTypes.has('complex_event_property_should_has_same_child_property')) {
    fixArrayRowConsistency(draft, errors);
    fixed.push(t('fix.array_row_consistency'));
  }

  // 修复事件属性名不合法
  if (errorTypes.has('event_prop_name_invalid')) {
    fixEventPropNameInvalid(draft, errors);
    fixed.push(t('fix.event_prop_name_invalid'));
  }

  // 修复事件名重复
  if (errorTypes.has('event_name_duplicate')) {
    fixEventNameDuplicate(draft, errors);
    fixed.push(t('fix.event_name_duplicate'));
  }

  return fixed;
}

/**
 * 内部校验修复（在生成 xlsx 前执行）
 */
export function validateAndFix(draft: Draft): string[] {
  const fixed: string[] = [];

  // 1. 修复未知属性引用
  const unknownFixes = fixUnknownPropRefs(draft);
  if (unknownFixes.length > 0) {
    fixed.push(t('fix.unknown_prop_ref'));
  }

  // 2. 修复显示名重复
  const displayFixes = fixDisplayNameDuplicates(draft);
  if (displayFixes.length > 0) {
    fixed.push(t('fix.display_name_dedup'));
  }

  // 2.5 修复跨池 display_name 不一致
  const crossPoolFixes = fixCrossPoolDisplayNameInconsistency(draft);
  if (crossPoolFixes.length > 0) {
    fixed.push(`Cross-pool display_name consistency: ${crossPoolFixes.length} property(s) aligned`);
  }

  // 2.6 根据 sdk_integration_mode 自动填充事件 platform
  const platformFixes = fixEventPlatforms(draft);
  if (platformFixes.length > 0) {
    fixed.push(...platformFixes);
  }

  // 3. 修复复合类型（对象/对象组）子属性不一致
  const compositeChildren = new Map<string, string[]>();
  const evProps = draft.event_properties ?? (draft as any).common_properties ?? [];
  for (const prop of evProps) {
    if (prop.type === 'array_row' || prop.type === 'object') {
      compositeChildren.set(prop.name, []);
    }
  }
  for (const prop of evProps) {
    if (prop.name.includes('.')) {
      const parent = prop.name.split('.')[0];
      const children = compositeChildren.get(parent);
      if (children) {
        children.push(prop.name);
      }
    }
  }

  let needFix = false;
  for (const event of draft.events) {
    if (!event.prop_names) continue;
    for (const [parentName, children] of compositeChildren) {
      if (event.prop_names.includes(parentName)) {
        for (const child of children) {
          if (!event.prop_names.includes(child)) {
            needFix = true;
          }
        }
      }
    }
  }

  if (needFix) {
    fixArrayRowConsistency(draft, []);
    fixed.push(t('fix.array_row_consistency'));
  }

  return fixed;
}