import fs from 'node:fs';
import path from 'node:path';
import type { Draft, Event, SDKType, SDKIntegrationMode, ServerLanguage, ClientLanguage, UserIdentity } from './types.js';
import { getAutotrackEvents, ALL_AUTOTRACK_EVENT_NAMES } from './autotrack.js';
import type { Locale } from '../i18n/locale.js';

export interface DraftMeta {
  app_type: string;
  sdk_integration_mode: SDKIntegrationMode;
  client_platforms?: SDKType[];
  client_sdk_type?: SDKType;
  client_languages?: ClientLanguage[];
  client_platform_languages?: Record<SDKType, ClientLanguage[]>;
  server_language?: ServerLanguage;
  project_id?: number;
  plan_name: string;
  scenario?: string;
  user_identity?: UserIdentity;
}

export function emptyDraft(meta: DraftMeta): Draft {
  return {
    meta: {
      app_type: meta.app_type,
      sdk_integration_mode: meta.sdk_integration_mode,
      client_platforms: meta.client_platforms,
      client_sdk_type: meta.client_sdk_type,
      client_languages: meta.client_languages,
      client_platform_languages: meta.client_platform_languages,
      server_language: meta.server_language,
      project_id: meta.project_id,
      plan_name: meta.plan_name,
      scenario: meta.scenario,
      user_identity: meta.user_identity,
    },
    events: [],
    event_properties: [],
    common_event_properties: [],
    user_properties: [],
  };
}

// 兼容旧接口
export function emptyDraftLegacy(appType: string, planName: string, sdkType?: SDKType): Draft {
  return emptyDraft({
    app_type: appType,
    sdk_integration_mode: 'client_only',
    client_sdk_type: sdkType,
    plan_name: planName,
  });
}

export function loadDraft(p: string): Draft {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Draft;
}

export function saveDraft(d: Draft, p: string): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
}

/**
 * 向 draft 注入 SDK 自动采集事件，同时清理模板/现有方案中不属于用户所选 SDK 的自动采集事件。
 * 自动采集事件放在 events 数组末尾，标记 source: "autotrack", platform: "client"
 */
export function injectAutotrackEvents(draft: Draft, locale: Locale = 'zh'): Draft {
  const mode = draft.meta.sdk_integration_mode;

  // 仅 client_only 或 both 模式才注入自动采集事件
  if (mode === 'server_only') {
    return draft; // 服务端 SDK 无自动采集事件
  }

  // 多平台时 client_platforms 优先；单平台/无 platforms 时 fallback 到 client_sdk_type
  const platforms = draft.meta.client_platforms;
  const sdkType = draft.meta.client_sdk_type || draft.meta.sdk_type;
  if (!platforms?.length && !sdkType) {
    return draft; // 未指定客户端 SDK 类型，不注入
  }

  // 多平台（≥2）用 platforms 数组；单平台用 sdkType
  let autotrackEvents: Event[] = [];
  const sdkTypeOrPlatforms = (platforms && platforms.length >= 2) ? platforms : (sdkType || platforms);

  if (Array.isArray(sdkTypeOrPlatforms)) {
    const allEvents = (sdkTypeOrPlatforms as SDKType[]).map(t => getAutotrackEvents(t, locale)).flat();
    // 去重（Android 和 iOS 的自动采集事件相同）
    const seen = new Set<string>();
    autotrackEvents = allEvents.filter(e => {
      if (seen.has(e.event_name)) return false;
      seen.add(e.event_name);
      return true;
    });
  } else {
    autotrackEvents = getAutotrackEvents(sdkTypeOrPlatforms as SDKType, locale);
  }

  // 清理不属于用户所选 SDK 的自动采集事件
  // 模板或现有方案中可能包含其他 SDK 的自动采集事件（如 Android 模板含 ta_app_*
  // 但用户选择了 JavaScript SDK），需要移除这些不匹配的事件
  const validNames = new Set(autotrackEvents.map(e => e.event_name));
  draft.events = draft.events.filter(e => {
    if (ALL_AUTOTRACK_EVENT_NAMES.has(e.event_name)) {
      return validNames.has(e.event_name);
    }
    return true; // 非自动采集事件原样保留
  });

  // 过滤掉已存在于 draft 中的同名事件（不管 source，模板可能已包含自动采集事件）
  const existingNames = new Set(draft.events.map(e => e.event_name));

  const newEvents = autotrackEvents.filter(e => !existingNames.has(e.event_name));

  // 将自动采集事件追加到末尾，并设置 platform: "client"
  const eventsWithPlatform = newEvents.map(e => ({
    ...e,
    platform: 'client' as const,
  }));

  draft.events.push(...eventsWithPlatform);

  return draft;
}

/**
 * 获取 draft 中的业务事件（排除自动采集事件）
 */
export function getBusinessEvents(draft: Draft): Event[] {
  return draft.events.filter(e => e.source !== 'autotrack');
}

/**
 * 获取 draft 中的自动采集事件
 */
export function getAutotrackEventsFromDraft(draft: Draft): Event[] {
  return draft.events.filter(e => e.source === 'autotrack');
}

/**
 * 按 platform 分组获取事件
 */
export function getEventsByPlatform(draft: Draft): {
  client: Event[];
  server: Event[];
  both: Event[];
} {
  return {
    client: draft.events.filter(e => e.platform === 'client'),
    server: draft.events.filter(e => e.platform === 'server'),
    both: draft.events.filter(e => e.platform === 'both'),
  };
}
