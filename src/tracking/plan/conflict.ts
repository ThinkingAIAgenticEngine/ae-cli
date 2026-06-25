import type { Draft } from './types.js';
import { t } from '../i18n/translate.js';

/**
 * 冲突检测
 * 在追加模式下，对比新方案与既有方案，检测两类冲突：
 * - A: 同名属性类型不一致（严重）
 * - B: 同名事件已存在（提醒）
 */

export interface Conflict {
  type: 'property_type_conflict' | 'event_exists';
  severity: 'error' | 'warning';
  name: string;
  existingType?: string;
  newType?: string;
  existingPropCount?: number;
  newPropCount?: number;
}

export interface ConflictResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  conflicts: Conflict[];
}

/**
 * 检测新方案与既有方案的冲突
 */
export function detectConflicts(newDraft: Draft, existingDraft: Draft): ConflictResult {
  const conflicts: Conflict[] = [];

  // 冲突类型 A：同名属性类型不一致
  // 检查三个属性池：event_properties, common_event_properties, user_properties

  // event_properties
  for (const newProp of newDraft.event_properties) {
    const existingProp = existingDraft.event_properties.find(p => p.name === newProp.name);
    if (existingProp && existingProp.type !== newProp.type) {
      conflicts.push({
        type: 'property_type_conflict',
        severity: 'error',
        name: newProp.name,
        existingType: existingProp.type,
        newType: newProp.type,
      });
    }
  }

  // common_event_properties
  for (const newProp of newDraft.common_event_properties) {
    const existingProp = existingDraft.common_event_properties.find(p => p.name === newProp.name);
    if (existingProp && existingProp.type !== newProp.type) {
      conflicts.push({
        type: 'property_type_conflict',
        severity: 'error',
        name: newProp.name,
        existingType: existingProp.type,
        newType: newProp.type,
      });
    }
  }

  // user_properties
  for (const newProp of newDraft.user_properties) {
    const existingProp = existingDraft.user_properties.find(p => p.name === newProp.name);
    if (existingProp && existingProp.type !== newProp.type) {
      conflicts.push({
        type: 'property_type_conflict',
        severity: 'error',
        name: newProp.name,
        existingType: existingProp.type,
        newType: newProp.type,
      });
    }
  }

  // 冲突类型 B：同名事件已存在
  for (const newEvent of newDraft.events) {
    const existingEvent = existingDraft.events.find(e => e.event_name === newEvent.event_name);
    if (existingEvent) {
      conflicts.push({
        type: 'event_exists',
        severity: 'warning',
        name: newEvent.event_name,
        existingPropCount: existingEvent.prop_names.length,
        newPropCount: newEvent.prop_names.length,
      });
    }
  }

  return {
    hasErrors: conflicts.some(c => c.severity === 'error'),
    hasWarnings: conflicts.some(c => c.severity === 'warning'),
    conflicts,
  };
}

/**
 * 格式化冲突报告（用于 CLI 输出）
 */
export function formatConflictReport(result: ConflictResult, existingSummary: { events: number; eventProps: number; commonProps: number; userProps: number }): string {
  const lines: string[] = [];

  lines.push(t('conflict.existing_plan_title'));
  lines.push(t('conflict.events_count', { count: existingSummary.events }));
  lines.push(t('conflict.event_props_count', { count: existingSummary.eventProps }));
  lines.push(t('conflict.common_props_count', { count: existingSummary.commonProps }));
  lines.push(t('conflict.user_props_count', { count: existingSummary.userProps }));
  lines.push('');

  if (result.hasErrors) {
    lines.push(t('conflict.severe_conflict_title'));
    lines.push('');
    lines.push(t('conflict.type_conflict_explanation'));
    lines.push('');
    lines.push(t('conflict.type_conflict_table_header'));
    lines.push('|---|---|---|');

    for (const c of result.conflicts.filter(c => c.type === 'property_type_conflict')) {
      lines.push(`| ${c.name} | ${c.existingType} | ${c.newType} |`);
    }

    lines.push('');
    lines.push(t('conflict.suggestion'));
    lines.push(t('conflict.suggestion_fix_types'));
    lines.push(t('conflict.suggestion_use_replace'));
  }

  if (result.hasWarnings && !result.hasErrors) {
    lines.push(t('conflict.warning_event_exists_title'));
    lines.push('');

    for (const c of result.conflicts.filter(c => c.type === 'event_exists')) {
      lines.push(t('conflict.event_exists_detail', { name: c.name, existingCount: c.existingPropCount ?? 0, newCount: c.newPropCount ?? 0 }));
    }

    lines.push('');
    lines.push(t('conflict.append_note'));
    lines.push(t('conflict.append_note_1'));
    lines.push(t('conflict.append_note_2'));
    lines.push(t('conflict.append_note_3'));
  }

  return lines.join('\n');
}