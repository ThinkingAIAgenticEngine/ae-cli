import type { Event, SDKType } from './types.js';
import type { Locale } from '../i18n/locale.js';

/**
 * SDK 自动采集事件定义（i18n 版本）
 * 根据 SDK 类型和语言返回对应的自动采集事件数组
 */

// 预置属性列表（由 SDK 自动采集，不需要定义到 event_properties）
export const PRESET_PROPERTIES = [
  '#duration',
  '#resume_from_background',
  '#screen_name',
  '#title',
  '#url',
  '#referrer',
  '#url_path',
  '#element_id',
  '#element_type',
  '#element_content',
  '#element_position',
  '#element_selector',
  '#element_name',
  '#app_crashed_reason',
  '#scene',
  '#start_reason',
  '#background_duration',
];

// ---- 自动采集事件 i18n 数据 ----
interface AutotrackEventI18n {
  display_name: Record<Locale, string>;
  desc: Record<Locale, string>;
}

const TAG: Record<Locale, string> = {
  zh: '系统事件',
  en: 'System Event',
  ja: 'システムイベント',
  ko: '시스템 이벤트',
};

const AUTOTRACK_I18N: Record<string, AutotrackEventI18n> = {
  // --- Android/iOS 通用 ---
  ta_app_install: {
    display_name: { zh: 'APP 安装', en: 'App Install', ja: 'アプリインストール', ko: '앱 설치' },
    desc: { zh: 'APP 首次安装时上报，升级不触发，删除重装会触发', en: 'Triggered on first app install; not on upgrade; re-triggered on reinstall', ja: 'アプリ初回インストール時に報告。アップグレードでは発生せず、再インストールで再発生', ko: '앱 최초 설치 시 보고됩니다. 업그레이드 시에는 발생하지 않으며 재설치 시 다시 발생합니다' },
  },
  ta_app_start: {
    display_name: { zh: 'APP 启动', en: 'App Start', ja: 'アプリ起動', ko: '앱 시작' },
    desc: { zh: '用户开启 APP 或从后台唤醒时触发', en: 'Triggered when user opens the app or brings it from background', ja: 'ユーザーがアプリを開くか、バックグラウンドから復帰した時に発生', ko: '사용자가 앱을 열거나 백그라운드에서 가져올 때 발생합니다' },
  },
  ta_app_end: {
    display_name: { zh: 'APP 关闭', en: 'App End', ja: 'アプリ終了', ko: '앱 종료' },
    desc: { zh: '用户关闭 APP 或将 APP 调至后台时触发', en: 'Triggered when user closes the app or moves it to background', ja: 'ユーザーがアプリを閉じるか、バックグラウンドに移動した時に発生', ko: '사용자가 앱을 닫거나 백그라운드로 이동할 때 발생합니다' },
  },
  ta_app_view: {
    display_name: { zh: 'APP 页面浏览', en: 'App Page View', ja: 'アプリページビュー', ko: '앱 페이지 조회' },
    desc: { zh: '用户浏览页面（Activity/ViewController）时触发', en: 'Triggered when user views a page (Activity/ViewController)', ja: 'ユーザーがページ（Activity/ViewController）を閲覧した時に発生', ko: '사용자가 페이지(Activity/ViewController)를 조회할 때 발생합니다' },
  },
  ta_app_click: {
    display_name: { zh: 'APP 控件点击', en: 'App Control Click', ja: 'アプリコントロールクリック', ko: '앱 컨트롤 클릭' },
    desc: { zh: '用户点击控件时触发', en: 'Triggered when user clicks a UI control', ja: 'ユーザーがUIコントロールをクリックした時に発生', ko: '사용자가 UI 컨트롤을 클릭할 때 발생합니다' },
  },
  ta_app_crash: {
    display_name: { zh: 'APP 崩溃', en: 'App Crash', ja: 'アプリクラッシュ', ko: '앱 충돌' },
    desc: { zh: 'APP 出现未捕获异常时上报', en: 'Reported when the app encounters an uncaught exception', ja: 'アプリがキャッチされない例外に遭遇した時に報告', ko: '앱이 처리되지 않은 예외를 만났을 때 보고됩니다' },
  },

  // --- JavaScript (Web/H5) ---
  ta_pageview: {
    display_name: { zh: '页面浏览', en: 'Page View', ja: 'ページビュー', ko: '페이지 조회' },
    desc: { zh: '调用 ta.quick("autoTrack") 时上报', en: 'Reported when ta.quick("autoTrack") is called', ja: 'ta.quick("autoTrack") 呼び出し時に報告', ko: 'ta.quick("autoTrack") 호출 시 보고됩니다' },
  },
  ta_page_show: {
    display_name: { zh: '页面显示', en: 'Page Show', ja: 'ページ表示', ko: '페이지 표시' },
    desc: { zh: '页面显示时触发（需开启配置）', en: 'Triggered when page is shown (requires config)', ja: 'ページ表示時に発生（設定が必要）', ko: '페이지가 표시될 때 발생합니다 (설정 필요)' },
  },
  ta_page_hide: {
    display_name: { zh: '页面隐藏', en: 'Page Hide', ja: 'ページ非表示', ko: '페이지 숨김' },
    desc: { zh: '页面隐藏时触发（需开启配置）', en: 'Triggered when page is hidden (requires config)', ja: 'ページ非表示時に発生（設定が必要）', ko: '페이지가 숨겨질 때 발생합니다 (설정 필요)' },
  },

  // --- 微信小程序 ---
  ta_mp_launch: {
    display_name: { zh: '小程序初始化', en: 'Mini Program Launch', ja: 'ミニプログラム初期化', ko: '미니프로그램 초기화' },
    desc: { zh: '小程序被首次打开时触发，进程生命周期内只触发一次', en: 'Triggered on first launch of mini program; only once per process lifecycle', ja: 'ミニプログラム初回起動時に発生。プロセスライフサイクル内で1回のみ', ko: '미니프로그램 최초 실행 시 발생합니다. 프로세스 수명 주기 내 한 번만 발생' },
  },
  ta_mp_show: {
    display_name: { zh: '小程序启动', en: 'Mini Program Show', ja: 'ミニプログラム起動', ko: '미니프로그램 시작' },
    desc: { zh: '小程序被启动或从后台调回前台时触发', en: 'Triggered when mini program is launched or brought to foreground', ja: 'ミニプログラムが起動またはバックグラウンドからフォアグラウンドに復帰した時に発生', ko: '미니프로그램이 시작되거나 백그라운드에서 포그라운드로 전환될 때 발생합니다' },
  },
  ta_mp_hide: {
    display_name: { zh: '小程序隐藏', en: 'Mini Program Hide', ja: 'ミニプログラム非表示', ko: '미니프로그램 숨김' },
    desc: { zh: '小程序被调入后台时触发', en: 'Triggered when mini program is moved to background', ja: 'ミニプログラムがバックグラウンドに移動した時に発生', ko: '미니프로그램이 백그라운드로 이동할 때 발생합니다' },
  },
  ta_mp_view: {
    display_name: { zh: '小程序页面浏览', en: 'Mini Program Page View', ja: 'ミニプログラムページビュー', ko: '미니프로그램 페이지 조회' },
    desc: { zh: '页面被打开或从后台调回前台时触发', en: 'Triggered when page is opened or brought to foreground', ja: 'ページが開かれるか、バックグラウンドからフォアグラウンドに復帰した時に発生', ko: '페이지가 열리거나 백그라운드에서 포그라운드로 전환될 때 발생합니다' },
  },
  ta_mp_share: {
    display_name: { zh: '小程序转发分享', en: 'Mini Program Share', ja: 'ミニプログラム共有', ko: '미니프로그램 공유' },
    desc: { zh: '转发按钮被点击时触发', en: 'Triggered when the share button is clicked', ja: '共有ボタンがクリックされた時に発生', ko: '공유 버튼이 클릭될 때 발생합니다' },
  },
  ta_page_leave: {
    display_name: { zh: '小程序页面卸载', en: 'Mini Program Page Unload', ja: 'ミニプログラムページアンロード', ko: '미니프로그램 페이지 언로드' },
    desc: { zh: '页面卸载时触发', en: 'Triggered when the page is unloaded', ja: 'ページがアンロードされた時に発生', ko: '페이지가 언로드될 때 발생합니다' },
  },
  ta_add_favorite: {
    display_name: { zh: '小程序页面收藏', en: 'Mini Program Favorite', ja: 'ミニプログラムお気に入り', ko: '미니프로그램 즐겨찾기' },
    desc: { zh: '页面被收藏时触发', en: 'Triggered when the page is bookmarked', ja: 'ページがブックマークされた時に発生', ko: '페이지가 즐겨찾기에 추가될 때 발생합니다' },
  },
  ta_mp_click: {
    display_name: { zh: '小程序元素点击', en: 'Mini Program Element Click', ja: 'ミニプログラム要素クリック', ko: '미니프로그램 요소 클릭' },
    desc: { zh: '页面元素被点击时触发', en: 'Triggered when a page element is clicked', ja: 'ページ要素がクリックされた時に発生', ko: '페이지 요소가 클릭될 때 발생합니다' },
  },

  // --- Unity 微信小游戏 ---
  ta_mg_launch: {
    display_name: { zh: '小游戏初始化', en: 'Mini Game Launch', ja: 'ミニゲーム初期化', ko: '미니게임 초기화' },
    desc: { zh: '小游戏首次打开时触发', en: 'Triggered on first launch of mini game', ja: 'ミニゲーム初回起動時に発生', ko: '미니게임 최초 실행 시 발생합니다' },
  },
  ta_mg_show: {
    display_name: { zh: '小游戏启动', en: 'Mini Game Show', ja: 'ミニゲーム起動', ko: '미니게임 시작' },
    desc: { zh: '小游戏进入前台时触发', en: 'Triggered when mini game enters foreground', ja: 'ミニゲームがフォアグラウンドに入った時に発生', ko: '미니게임이 포그라운드로 진입할 때 발생합니다' },
  },
  ta_mg_hide: {
    display_name: { zh: '小游戏隐藏', en: 'Mini Game Hide', ja: 'ミニゲーム非表示', ko: '미니게임 숨김' },
    desc: { zh: '小游戏进入后台时触发', en: 'Triggered when mini game enters background', ja: 'ミニゲームがバックグラウンドに入った時に発生', ko: '미니게임이 백그라운드로 진입할 때 발생합니다' },
  },

  // --- Unity 场景事件（optional） ---
  ta_scene_loaded: {
    display_name: { zh: '场景加载', en: 'Scene Load', ja: 'シーンロード', ko: '씬 로드' },
    desc: { zh: '游戏场景（Scene）加载时触发', en: 'Triggered when a game scene is loaded', ja: 'ゲームシーン（Scene）のロード時に発生', ko: '게임 씬(Scene)이 로드될 때 발생합니다' },
  },
  ta_scene_unloaded: {
    display_name: { zh: '场景卸载', en: 'Scene Unload', ja: 'シーンアンロード', ko: '씬 언로드' },
    desc: { zh: '游戏场景（Scene）卸载时触发', en: 'Triggered when a game scene is unloaded', ja: 'ゲームシーン（Scene）のアンロード時に発生', ko: '게임 씬(Scene)이 언로드될 때 발생합니다' },
  },
};

/** 根据事件名和语言构造单条自动采集事件 */
function makeAutotrackEvent(eventName: string, locale: Locale): Event {
  const i18n = AUTOTRACK_I18N[eventName];
  return {
    event_name: eventName,
    display_name: i18n?.display_name[locale] ?? eventName,
    event_tag: TAG[locale],
    event_desc: i18n?.desc[locale] ?? '',
    source: 'autotrack',
    prop_names: [],
  };
}

// ---- SDK 类型 → 推荐/可选事件名列表 ----
// 依据: autotrack-events.md，默认只注入 recommended 事件

/** 默认注入的 recommended 事件 */
const SDK_RECOMMENDED: Record<string, string[]> = {
  nativeApp: ['ta_app_install', 'ta_app_start', 'ta_app_end'],
  js:        ['ta_page_show', 'ta_page_hide'],
  wechatMp:  ['ta_mp_launch', 'ta_mp_show', 'ta_mp_hide', 'ta_mp_view', 'ta_mp_share'],
  wechatMg:  ['ta_mp_launch', 'ta_mp_show', 'ta_mp_hide'],
  unity:     ['ta_app_install', 'ta_app_start', 'ta_app_end'],
  unityWxmg: ['ta_mg_launch', 'ta_mg_show', 'ta_mg_hide'],
  gameEngine:['ta_app_install', 'ta_app_start', 'ta_app_end'],
};

/** optional 事件（不自动注入，供 Refine 阶段提示用户可选开启） */
export const SDK_OPTIONAL: Record<string, string[]> = {
  nativeApp: ['ta_app_view', 'ta_app_click', 'ta_app_crash'],
  js:        ['ta_pageview'],
  wechatMp:  ['ta_page_leave', 'ta_add_favorite', 'ta_mp_click'],
  wechatMg:  [],
  unity:     ['ta_scene_loaded', 'ta_scene_unloaded'],
  unityWxmg: ['ta_scene_loaded', 'ta_scene_unloaded'],
  gameEngine:[],
};

/**
 * 根据 SDK 类型和语言获取对应的自动采集事件
 */
export function getAutotrackEvents(sdkType: SDKType, locale: Locale = 'zh'): Event[] {
  let group: string;
  switch (sdkType) {
    case 'android': case 'ios': case 'react_native': case 'flutter': case 'uniapp_app':
      group = 'nativeApp'; break;
    case 'javascript': case 'uniapp_h5':
      group = 'js'; break;
    case 'wechat_mp': case 'douyin_mp': case 'alipay_mp': case 'other_mp': case 'uniapp_mp':
      group = 'wechatMp'; break;
    case 'wechat_mg':
      group = 'wechatMg'; break;
    case 'unity':
      group = 'unity'; break;
    case 'unity_wxmg':
      group = 'unityWxmg'; break;
    case 'cocos2dx': case 'cocoscreator': case 'layaair': case 'unreal':
      group = 'gameEngine'; break;
    default:
      return [];
  }
  return (SDK_RECOMMENDED[group] ?? []).map(name => makeAutotrackEvent(name, locale));
}

/**
 * 根据 SDK 类型获取可选自动采集事件（用于 Refine 阶段提示用户可选开启）
 */
export function getOptionalAutotrackEvents(sdkType: SDKType, locale: Locale = 'zh'): Event[] {
  let group: string;
  switch (sdkType) {
    case 'android': case 'ios': case 'react_native': case 'flutter': case 'uniapp_app':
      group = 'nativeApp'; break;
    case 'javascript': case 'uniapp_h5':
      group = 'js'; break;
    case 'wechat_mp': case 'douyin_mp': case 'alipay_mp': case 'other_mp': case 'uniapp_mp':
      group = 'wechatMp'; break;
    case 'wechat_mg':
      group = 'wechatMg'; break;
    case 'unity':
      group = 'unity'; break;
    case 'unity_wxmg':
      group = 'unityWxmg'; break;
    case 'cocos2dx': case 'cocoscreator': case 'layaair': case 'unreal':
      group = 'gameEngine'; break;
    default:
      return [];
  }
  return (SDK_OPTIONAL[group] ?? []).map(name => makeAutotrackEvent(name, locale));
}

// ---- SDK 类型显示名称（i18n） ----
export const SDK_TYPE_DISPLAY_NAMES: Record<SDKType, Record<Locale, string>> = {
  android:       { zh: 'Android SDK',            en: 'Android SDK',              ja: 'Android SDK',                ko: 'Android SDK' },
  ios:           { zh: 'iOS SDK',                en: 'iOS SDK',                  ja: 'iOS SDK',                    ko: 'iOS SDK' },
  openharmony:   { zh: 'OpenHarmony SDK',        en: 'OpenHarmony SDK',          ja: 'OpenHarmony SDK',            ko: 'OpenHarmony SDK' },
  javascript:    { zh: 'JavaScript SDK',         en: 'JavaScript SDK',           ja: 'JavaScript SDK',             ko: 'JavaScript SDK' },
  wechat_mp:     { zh: '微信小程序 SDK',          en: 'WeChat Mini Program SDK',  ja: 'WeChatミニプログラムSDK',      ko: '위챗 미니프로그램 SDK' },
  wechat_mg:     { zh: '微信小游戏 SDK',          en: 'WeChat Mini Game SDK',     ja: 'WeChatミニゲームSDK',         ko: '위챗 미니게임 SDK' },
  douyin_mp:     { zh: '抖音小程序 SDK',          en: 'Douyin Mini Program SDK',  ja: 'DouyinミニプログラムSDK',     ko: '더우인 미니프로그램 SDK' },
  alipay_mp:     { zh: '支付宝小程序 SDK',        en: 'Alipay Mini Program SDK',  ja: 'AlipayミニプログラムSDK',     ko: '알리페이 미니프로그램 SDK' },
  other_mp:      { zh: '其他小程序 SDK',          en: 'Other Mini Program SDK',   ja: 'その他ミニプログラムSDK',       ko: '기타 미니프로그램 SDK' },
  unity:         { zh: 'Unity SDK',             en: 'Unity SDK',                ja: 'Unity SDK',                  ko: 'Unity SDK' },
  unity_wxmg:    { zh: 'Unity 微信小游戏',        en: 'Unity WeChat Mini Game',   ja: 'Unity WeChatミニゲーム',       ko: 'Unity 위챗 미니게임' },
  cocos2dx:      { zh: 'Cocos2d-x SDK',         en: 'Cocos2d-x SDK',            ja: 'Cocos2d-x SDK',              ko: 'Cocos2d-x SDK' },
  cocoscreator:  { zh: 'CocosCreator SDK',      en: 'CocosCreator SDK',         ja: 'CocosCreator SDK',           ko: 'CocosCreator SDK' },
  layaair:       { zh: 'LayaAir SDK',           en: 'LayaAir SDK',              ja: 'LayaAir SDK',                ko: 'LayaAir SDK' },
  unreal:        { zh: 'Unreal SDK',            en: 'Unreal SDK',               ja: 'Unreal SDK',                 ko: 'Unreal SDK' },
  react_native:  { zh: 'React Native SDK',      en: 'React Native SDK',         ja: 'React Native SDK',           ko: 'React Native SDK' },
  flutter:       { zh: 'Flutter SDK',           en: 'Flutter SDK',              ja: 'Flutter SDK',                ko: 'Flutter SDK' },
  uniapp_mp:     { zh: 'uni-app 小程序端',        en: 'uni-app (Mini Program)',   ja: 'uni-app（ミニプログラム）',      ko: 'uni-app (미니프로그램)' },
  uniapp_app:    { zh: 'uni-app APP端',          en: 'uni-app (App)',            ja: 'uni-app（アプリ）',            ko: 'uni-app (앱)' },
  uniapp_h5:     { zh: 'uni-app H5端',           en: 'uni-app (H5)',             ja: 'uni-app（H5）',               ko: 'uni-app (H5)' },
};

/** 获取 SDK 类型显示名 */
export function sdkTypeDisplayName(sdkType: SDKType, locale: Locale): string {
  return SDK_TYPE_DISPLAY_NAMES[sdkType]?.[locale] ?? sdkType;
}

// ---- 应用类型 → 可选 SDK 类型映射 ----
export const APP_TYPE_SDK_OPTIONS: Record<string, SDKType[]> = {
  'Android': ['android'],
  'iOS': ['ios'],
  'H5': ['javascript'],
  'Web': ['javascript'],
  'Mini Program': ['wechat_mp', 'wechat_mg', 'douyin_mp', 'alipay_mp', 'other_mp'],
  'Unity': ['unity', 'unity_wxmg'],
  'Game Engine': ['cocos2dx', 'cocoscreator', 'layaair', 'unreal'],
  'Cross Platform': ['react_native', 'flutter', 'uniapp_mp', 'uniapp_app', 'uniapp_h5'],
};
