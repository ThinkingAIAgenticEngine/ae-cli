export type PropType = 'string' | 'number' | 'bool' | 'datetime' | 'object' | 'array_row' | 'array_string';
export type UpdateType = 'user_set' | 'user_setOnce' | 'user_add';
export type Source = 'template' | 'prd' | 'chat' | 'codebase' | 'website' | 'autotrack' | 'business_dimension';

// SDK 集成模式
export type SDKIntegrationMode = 'client_only' | 'server_only' | 'both';

// 事件上报平台
export type EventPlatform = 'client' | 'server' | 'both';

// 服务端开发语言
export type ServerLanguage =
  | 'java'
  | 'python'
  | 'go'
  | 'nodejs'
  | 'php'
  | 'csharp'
  | 'cpp'
  | 'ruby'
  | 'lua'
  | 'other';

// 客户端开发语言（游戏引擎等需指定）
export type ClientLanguage =
  | 'java'
  | 'kotlin'
  | 'objc'
  | 'swift'
  | 'javascript'
  | 'typescript'
  | 'csharp'
  | 'cpp'
  | 'lua'
  | 'dart'
  | 'vue'
  | 'other';

// SDK 类型定义
export type SDKType =
  | 'android'
  | 'ios'
  | 'openharmony'
  | 'javascript'
  | 'wechat_mp'      // 微信小程序
  | 'wechat_mg'      // 微信小游戏
  | 'douyin_mp'      // 抖音小程序
  | 'alipay_mp'      // 支付宝小程序
  | 'other_mp'       // 其他小程序
  | 'unity'
  | 'unity_wxmg'     // Unity 微信小游戏
  | 'cocos2dx'
  | 'cocoscreator'
  | 'layaair'
  | 'unreal'
  | 'react_native'
  | 'flutter'
  | 'uniapp_mp'      // uni-app 小程序端
  | 'uniapp_app'     // uni-app APP端
  | 'uniapp_h5';     // uni-app H5端

export interface Property {
  name: string;
  display_name?: string;
  type: PropType;
  desc?: string;
  source: Source;
}

export interface UserProperty extends Property {
  update_type?: UpdateType;  // 可选，默认 user_set
  prop_tag?: string;
}

export interface Event {
  event_name: string;
  display_name?: string;
  event_tag?: string;
  event_desc?: string;
  platform?: EventPlatform;        // 上报平台：client / server / both
  source: Source;
  prop_names: string[];
}

// 账号 ID 来源类型
export type AccountIdSource = 'user_account' | 'role_id' | 'none';

// 访客 ID 生成策略
export type DistinctIdStrategy = 'auto' | 'device_id' | 'custom';

// 用户体系配置
export interface UserIdentity {
  account_id_source: AccountIdSource;
  account_id_field?: string;                 // 账号 ID 字段名（仅 user_account 时填写，如 user_id / phone / username）
  distinct_id_strategy: DistinctIdStrategy;
  distinct_id_custom_value?: string; // 仅 strategy=custom 时填写
}

// 收入模型类型
// IAA: 广告变现, IAP: 内购变现, mixed: 混合, subscription: 订阅, commission: 交易抽成
export type RevenueModel = 'IAA' | 'IAP' | 'mixed' | 'subscription' | 'commission' | 'none';

// 货币类型配置
export interface CurrencyConfig {
  name: string;              // 货币名称，如"钻石"、"金币"
  get_sources: string[];    // 获取来源列表
  consume_uses: string[];   // 消耗用途列表
}

// 业务维度配置
export interface BusinessDimension {
  revenue_model: RevenueModel;
  core_loop?: string;                    // 核心玩法循环描述
  functional_entries?: string[];         // 功能入口列表
  currency_system?: {
    hard_currency?: CurrencyConfig;   // 硬货币（付费货币）
    soft_currency?: CurrencyConfig;   // 软货币（免费货币）
  };
  ad_scenes?: string[];                 // 广告场景（仅 IAA / 混合模式）
  iap_items?: string[];                  // 内购物品（仅 IAP / 混合模式）
}

export interface Draft {
  meta: {
    app_type: string;
    sdk_integration_mode: SDKIntegrationMode;  // SDK 集成模式
    client_platforms?: SDKType[];                // 客户端 SDK 类型列表（支持多平台）
    client_sdk_type?: SDKType;                  // 客户端主 SDK 类型（向后兼容）
    client_languages?: ClientLanguage[];        // 客户端开发语言列表（每平台可能多个）
    client_platform_languages?: Record<SDKType, ClientLanguage[]>; // 每平台对应语言：{ "android": ["java", "kotlin"], "openharmony": ["typescript"] }
    server_language?: ServerLanguage;           // 服务端开发语言
    project_id?: number;                        // AE 项目 ID
    host?: string;                              // AE web 地址
    plan_name: string;
    scenario?: string;
    source_type?: string;              // 素材来源类型
    user_identity?: UserIdentity;
    business_dimension?: BusinessDimension; // 业务维度配置（Phase 1.3 注入）
    // 国际化
    lang?: string;          // xlsx 输出语言：zh / en / ja / ko（默认 zh，向后兼容）
    // 归档状态（archive 命令写入）
    archived_at?: string;   // ISO date string, e.g. "2026-05-23"
    archived_path?: string; // 归档后的 xlsx 路径
    // 兼容旧字段（deprecated）
    sdk_type?: SDKType;
  };
  events: Event[];
  event_properties: Property[];
  common_event_properties: Property[];
  user_properties: UserProperty[];
}
