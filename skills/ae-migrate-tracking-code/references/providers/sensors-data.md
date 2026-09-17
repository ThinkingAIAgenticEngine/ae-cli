# Sensors Data (神策) Adapter

> **Terminology**: 事件 = event | 属性 = event property / user property | 用户 ID = user id | 公共属性 = super property | 预置属性 = preset property | 自动采集 = auto-track

## 1. Recognition

**Core API is identical across every Sensors Data SDK** (verified against `manual.sensorsdata.cn`): `track` (event), `login` / `identify` (identity — `identify` is an alias of `login`), `profileSet` (user properties, new naming), `register` (super properties, native SDKs also expose `registerSuperProperties`), `quick` (quick track).

**Two user-property naming conventions coexist:**

- **New naming** (all SDKs): `profileSet` / `profileSetOnce` / `profileAppend` / `profileIncrement` / `profileUnset`.
- **Legacy naming** (Web JS, WeChat & other mini-programs, Harmony only): `setProfile` / `setOnceProfile` / `appendProfile` / `incrementProfile` / `unsetProfile` / `deleteProfile`.

### Client SDKs

| Platform | Import / init | Notes |
|---|---|---|
| Web (JS) | `sensors.init({ server_url: '...', is_track_single_page: true })` | both naming conventions; `sensors.registerPage` / `registerSession`; `getPresetProperties()`; `quick('autoTrack')` |
| Android | `com.sensorsdata.analytics.android.sdk.SensorsDataAPI` | new naming; `registerSuperProperties`; `trackAppInstall()` preset event |
| iOS | `import SensorsAnalyticsSDK` | new naming; `registerSuperProperties` |
| Harmony | Harmony SDK (HAR) | both naming conventions; `register` |
| macOS / tvOS | `SensorsAnalyticsSDK` | new naming; `trackInstallation()` preset event |
| C++ | Sensors Analytics C++ SDK | new naming (`profileSet`, `login`, `identify`, `register`) |
| React Native | `@sensorsdata/analytics` (npm) | new naming; `registerSuperProperties` |
| Flutter | `sensors_analytics` (pubspec) | new naming; `register` |
| Unity | Sensors Analytics Unity package | new naming; `register` |
| Unreal Engine | `unreal-engine-sdk` plugin | new naming; `register` |
| Cocos2d-x | Sensors Analytics Cocos SDK | new naming; `registerSuperProperties` |
| WeChat Mini Program | `sensorsdata.min.js` (小程序版) | both naming conventions; mirrors the web JS API |
| Other Mini Programs (Alipay/Baidu/ByteDance/QQ) | `sensorsdata.min.js` | both naming conventions; mirrors the web JS API |
| QuickApp (快应用) | Sensors Analytics QuickApp SDK | new naming (`profileSet*`); mirrors the core API |
| APICloud | Sensors Analytics APICloud plugin | new naming (`profileSet*`); mirrors the core API |
| uni-app | Sensors Analytics uni-app plugin | new naming (`profileSet*`); mirrors the core API |
| Weex | Sensors Analytics Weex SDK | new naming (`profileSet*`); mirrors the core API |
| Egret (HTML5 game engine) | Sensors Analytics Egret SDK | legacy naming (`setProfile*`), like Web JS |
| LayaAir (HTML5 game engine) | Sensors Analytics LayaAir SDK | legacy naming (`setProfile*`), like Web JS |

Common call shape (client): `sensors.track('event_name', { prop: value })` / `sensors.login(id)` / `sensors.profileSet({ k: v })` (or `setProfile` legacy) / `sensors.register({ k: v })`; native SDKs use the class instance (`SensorsDataAPI.sharedInstance().track(...)`, `SensorsAnalyticsSDK.sharedInstance()?.track(...)`).

### Server SDKs

All server SDKs share the same call shape (`track` / `login` / `profileSet...` / `register`) and map to the matching AE server SDK language:

| Language | Dependency (verified) |
|---|---|
| Java | `com.sensorsdata.analytics.javasdk:SensorsAnalyticsSDK` (Maven) — also exposes `flush`, `registerSuperProperties` |
| Python | `github.com/sensorsdata/sa-sdk-python` |
| Go | `github.com/sensorsdata/sa-sdk-go` |
| Node.js | `github.com/sensorsdata/sa-sdk-node` — also `registerSuperProperties` |
| PHP | `github.com/sensorsdata/sa-sdk-php` |
| Ruby | `github.com/sensorsdata/sa-sdk-ruby` (gem) |
| C | `github.com/sensorsdata/sa-sdk-c` |
| C# / .NET | `github.com/sensorsdata/sa-sdk-dotnet` |
| Lua | `github.com/sensorsdata/sa-sdk-lua` |

## 2. Event mapping rules

> **Forward compatibility**: preserve event/property names verbatim (skip snake_case — AE matches names case-sensitively) when historical Sensors Data data has been (or will be) imported into AE offline and must join with new SDK data; transform only hard-constraint violations, matching the names the offline import used. See `mapping-framework.md` §1.

- `track(eventName, props)` → `track(snake_case(eventName), props)`. Sensors Data event names are already snake_case by convention; only normalize camelCase/PascalCase if present.
- Event name: letters / digits / underscore, must start with a letter — same as AE.
- Reserved prefix `$` marks Sensors **preset properties** (e.g. `$app_version`, `$os`, `$ip`, `$time`, `$url`, `$is_first_day`) and **preset events** (e.g. `$pageview`, `$AppStart`, `$AppViewScreen`, `$AppClick`, `$WebClick`). Both are SDK-provided and must never become custom names: preset properties map to AE `#` preset properties — but only to names in the authoritative AE list (`references/ae-preset-properties.md`); a `$` property with no AE equivalent becomes a normal custom property (snake_case) or is dropped, never a made-up `#` name. Preset events map to AE auto-track or are dropped per §6. Surface each `$`-name mapping to the user for confirmation.
- Property types inferred per `mapping-framework.md`.

## 3. Identity mapping

- `login(id)` / `identify(id)` → AE `login(accountId)` (account_id_source `user_account`).
- No identity call → `account_id_source = "none"` (guest). Sensors auto-generates a `distinct_id` for anonymous users — normally AE visitor (SDK-managed), not `login`. **Forward compatibility**: map the auto `distinct_id` to AE `#distinct_id` via the AE visitor-id API (`setDistinctId` / `identify`) once at init, before any event; see `mapping-framework.md` §4.

## 4. User property mapping

| Source operation | AE method | Notes |
|---|---|---|
| `profileSet({k:v})` / `setProfile({k:v})` | `user_set` | overwrite |
| `profileSetOnce({k:v})` / `setOnceProfile({k:v})` | `user_setOnce` | first-write-wins |
| `profileAppend(name, v)` / `appendProfile(name, v)` | `user_append` | array append |
| `profileIncrement(name, n)` / `incrementProfile(name, n)` | `user_add` | numeric accumulate |
| `profileUnset(name)` / `unsetProfile(name)` | `user_unset` | remove the property value |
| `deleteProfile(name)` | `needs decision` | removes the property from the user profile entirely (Web/mini-program/Harmony legacy naming); AE has no SDK-side property delete — closest is `user_unset` (removes the value); confirm semantics with user |

> `user_append` / `user_unset` are code-level only — they do not enter the AE plan (`update_type` is `user_set` / `user_setOnce` / `user_add`); see `mapping-framework.md` §5.

## 5. Super property mapping

Sensors Data `register({k:v})` / `registerSuperProperties({k:v})` (public/super properties) attach to **every event** — they are event properties, never user properties. Map them to AE common event properties (`setSuperProperties`).

| Source operation | AE method | Notes |
|---|---|---|
| `register({k:v})` / `registerSuperProperties({k:v})` | `set_super_properties` (`setSuperProperties({...})`) | static common event property; lands in `draft.json` `common_event_properties` |

> `register` **accumulates** across calls, but AE `setSuperProperties` **overwrites** the whole set each call. Multiple `register` call sites must be merged into a single `setSuperProperties` (or flagged for the user) so earlier keys are not silently dropped.

## 6. Auto-track decision

Sensors Data auto-collects preset properties (all `$`-prefixed) and, when enabled, page/app-lifecycle events:

| Source auto-track | Decision |
|---|---|
| web page view (`$pageview` / `track_pageview`) | map to AE `ta_page_show` switch |
| app start / install | map to AE `ta_app_start` / `ta_app_install` switch |
| `sensors.quick('autoTrack')` | a config call enabling Sensors auto-track; drop the call and enable the equivalent AE auto-track switches via init instead |
| `trackAppInstall()` (Android) / `trackInstallation()` (macOS/tvOS) | preset install events (explicit calls, not auto-track) — map to AE `ta_app_install` switch, or drop since AE auto-tracks install |
| `$` preset properties | SDK-provided; map to AE `#` preset properties, never create as custom |

Enable via the AE SDK init switch, never as manual `track()`.

## 7. Dependency identifiers

| Platform | Remove in `switch` mode | Notes |
|---|---|---|
| Web | `sensorsdata.min.js` (script tag) / `sensorsdata` (npm) | remove the `sensors.init(...)` snippet too |
| Android | `com.sensorsdata.analytics.android:sensors-analytics-sdk` | Gradle |
| iOS | `SensorsAnalyticsSDK` (CocoaPods/SPM) | |
| Harmony | Harmony SDK (HAR) | |
| macOS / tvOS | `SensorsAnalyticsSDK` | |
| C++ | Sensors Analytics C++ SDK | remove from CMake / build config |
| React Native | `@sensorsdata/analytics` | npm |
| Flutter | `sensors_analytics` | pubspec |
| Unity | Sensors Analytics Unity package | remove from the Unity project |
| Unreal Engine | `unreal-engine-sdk` plugin | |
| Cocos2d-x | Sensors Analytics Cocos SDK | |
| Mini Program (WeChat/other) | `sensorsdata.min.js` | |
| QuickApp / APICloud / uni-app / Weex | per-framework plugin (see §1) | remove from the project config |
| Egret / LayaAir | Egret / LayaAir SDK plugin | remove from the game project |
| Server (Java) | `com.sensorsdata.analytics.javasdk:SensorsAnalyticsSDK` | Maven |
| Server (Python/Go/Node/PHP/Ruby/C/.NET/Lua) | `sa-sdk-<lang>` (see §1 table) | per-language package manager |

AE SDK dependency is resolved via the AE wiki (`ae-generate-tracking-code` → `references/sdk-index.md`), not here.

## 8. Official docs

- Docs portal: https://manual.sensorsdata.cn/ (per-platform client & server SDK sections)
- Web API reference (verified): https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_web_api/v0300
- Android: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_android_basic/v0300
- iOS: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_ios_use/v0300
- Harmony: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_harmony_api/v0300
- React Native: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_rn_api/v0300
- WeChat Mini Program: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_mp_wechat_api/v0300
- QuickApp: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_mp_quick_idm/v0300
- APICloud: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_apicloud/v0300
- uni-app: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_uni_app/v0300
- Weex: https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_weex/v0300
- Egret: https://manual.sensorsdata.cn/sa/docs/integrate_egret_sdk
- LayaAir: https://manual.sensorsdata.cn/sa/docs/base_api_layaair
- Server (Java): https://manual.sensorsdata.cn/sa/docs/tech_sdk_server_java_api/v0300
- Server SDK list: https://manual.sensorsdata.cn/sa/docs/tech_sdk_server/v0300
