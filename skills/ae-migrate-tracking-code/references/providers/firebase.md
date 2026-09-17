# Firebase Analytics Adapter

> **Terminology**: 事件 = event | 参数 = param / event parameter | 用户属性 = user property | 用户 ID = user id | 自动采集 = auto-track | 保留前缀 = reserved prefix

## 1. Recognition

### Web (JavaScript)

| Variant | Import | Event call |
|---|---|---|
| v8 namespaced | `import firebase from 'firebase/app'; import 'firebase/analytics';` | `firebase.analytics().logEvent('event_name', { param: value })` |
| v9 modular | `import { getAnalytics, logEvent } from 'firebase/analytics';` | `const analytics = getAnalytics(app); logEvent(analytics, 'event_name', { param: value })` |

Identity / user property calls (web):

| Call | v8 | v9 |
|---|---|---|
| set user id | `firebase.analytics().setUserId(id)` | `setUserId(analytics, id)` |
| set user properties | `firebase.analytics().setUserProperties({ k: v })` | `setUserProperties(analytics, { k: v })` |
| set default event params (common event properties) | `firebase.analytics().setDefaultEventParameters({ k: v })` | `setDefaultEventParameters(analytics, { k: v })` |
| toggle collection | `firebase.analytics().setAnalyticsCollectionEnabled(bool)` | `setAnalyticsCollectionEnabled(analytics, bool)` |

### Android

- Import: `com.google.firebase.analytics.FirebaseAnalytics`
- `mFirebaseAnalytics = FirebaseAnalytics.getInstance(context)`
- Event: `mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SELECT_CONTENT, bundle)` (bundle keys often `FirebaseAnalytics.Param.*` constants)
- Identity: `mFirebaseAnalytics.setUserId(id)`
- User property: `mFirebaseAnalytics.setUserProperty(name, value)`

### iOS

- Import: `FirebaseAnalytics` (`import FirebaseAnalytics` in Swift / `@import FirebaseAnalytics;` in Objective-C)
- Event: `Analytics.logEvent("event_name", parameters: [AnalyticsParameterItemID: "id"])` / ObjC `[FIRAnalytics logEventWithName:name parameters:params]`
- Identity: `Analytics.setUserID("id")` / ObjC `[FIRAnalytics setUserID:userID]`
- User property: `Analytics.setUserProperty(value, forName: name)` / ObjC `[FIRAnalytics setUserPropertyString:value forName:name]`

### Flutter

- `FirebaseAnalytics.instance.logEvent(name: 'event_name', parameters: {...})`
- `FirebaseAnalytics.instance.setUserId(id)`
- `FirebaseAnalytics.instance.setUserProperty(name: 'k', value: 'v')`

### React Native

- Import: `import analytics from '@react-native-firebase/analytics'`
- Event: `await analytics().logEvent('event_name', { param: value })`
- Identity: `await analytics().setUserId(id)`
- User property: `await analytics().setUserProperty('name', value)` / `setUserProperties({ k: v })`
- Screen: no `setCurrentScreen` — `screen_view` is auto-collected; to report a screen manually use `logEvent('screen_view', { screen_name, screen_class })`
- Toggle collection: `await analytics().setAnalyticsCollectionEnabled(bool)`
- Reset: `await analytics().resetAnalyticsData()` (e.g. on sign-out)
- Other: `getAppInstanceId()`, `setSessionTimeoutDuration(ms)`, `setConsent({...})`

### Unity

- Import: `using Firebase.Analytics;`
- Event: `FirebaseAnalytics.LogEvent(string eventName, Parameter[] parameters)` where each param is `new Parameter("method", "phone")`; event constant `Firebase.Analytics.FirebaseAnalytics.EventSelectContent`
- Identity: `FirebaseAnalytics.SetUserId(id)`
- User property: `FirebaseAnalytics.SetUserProperty("k", "v")`
- Other: `SetAnalyticsCollectionEnabled(bool)`, `SetSessionTimeoutDuration(ms)`, `GetAnalyticsInstanceId()`

### C++

- Import: `#include "firebase/analytics.h"` plus `firebase/analytics/event_names.h`, `firebase/analytics/parameter_names.h`, `firebase/analytics/user_property_names.h`
- Event: `firebase::analytics::LogEvent(name, parameters, parameter_count)` where `parameters` is `firebase::analytics::Parameter[]`; event constant `firebase::analytics::kEventSelectContent`
- Identity: `firebase::analytics::SetUserId(id)` — official examples also pass `analytics::Parameter("user_id", mUserId)` inside the event params
- User property: `firebase::analytics::SetUserProperty("k", "v")`
- Other: `SetAnalyticsCollectionEnabled(bool)`, `SetSessionTimeoutDuration(ms)`, `GetAnalyticsInstanceId()`

### Constant names (Android / iOS / Unity / C++)

Firebase defines event constants in UPPER_SNAKE (e.g. `SELECT_CONTENT`, `ADD_PAYMENT_INFO`, `TUTORIAL_BEGIN`), Unity in PascalCase (`EventSelectContent`), and C++ in `kEvent`-prefixed form (`kEventSelectContent`); param constants likewise (`ITEM_ID`, `VALUE`, `CURRENCY`). Map them all to lowercase snake_case in AE (`select_content`, `add_payment_info`, `item_id`, `value`, `currency`).

### Firebase ↔ GA4

Firebase Analytics and GA4 are the same data stream (GA4 is Firebase's web layer; one measurement ID is both). If `logEvent(...)` (Firebase) and `gtag(...)` (GA4) coexist in one project, merge them into a single migration run rather than two providers (see SKILL.md Phase 0).

## 2. Event mapping rules

> **Forward compatibility**: preserve event/property names verbatim (skip snake_case — AE matches names case-sensitively) when historical Firebase data has been (or will be) imported into AE offline and must join with new SDK data; transform only hard-constraint violations, matching the names the offline import used. See `mapping-framework.md` §1.

- `logEvent(eventName, params)` → `track(snake_case(eventName), props)`.
- **Event name constraints**: ≤ 40 chars; only alphanumeric + underscore; must start with a letter; no spaces. Violations are already impossible for valid Firebase calls, but snake_case conversion must still lower-case the constant forms — web literals, Android/iOS `Event.*`, Unity `EventXxx`, C++ `kEventXxx` (see Section 1).
- **Reserved prefixes** (cannot be custom events/params): `firebase_`, `google_`, `ga_`. If found, strip the prefix and flag for user confirmation.
- **Params**: ≤ 25 per event; param name ≤ 40 chars; param value ≤ 100 chars. Map each param to an AE property with a type inferred per `mapping-framework.md`.
- **Reserved events** (e.g. `screen_view`, `session_start`, `first_open`, `in_app_purchase`, `purchase`, `tutorial_begin`, `tutorial_complete`, `sign_up`, `login`) — do NOT rename; map `purchase`/`in_app_purchase` to a payment event and let the user decide the AE event name, drop analytics-internal ones per Section 6.
- Non-literal param values (variables): read the surrounding code to resolve the property name/type; mark unresolved ones for confirmation.

## 3. Identity mapping

- `setUserId(id)` → AE `login(accountId)` (account_id_source `user_account`).
- Firebase user id has no strict length documented; treat as opaque string.
- **Forward compatibility**: Firebase's auto anonymous id is `app_instance_id` on **native** platforms (Android/iOS/Flutter/Unity/C++/React Native — read it via `getAppInstanceId()` / `appInstanceID` / `GetAnalyticsInstanceId()` per platform), but on **web** (v8/v9) the JS SDK has **no** `getAppInstanceId()` — the anonymous id there is the GA4 `client_id`, read via `getGoogleAnalyticsClientId(analytics)` (v9) / `firebase.analytics().getGoogleAnalyticsClientId()` (v8); it is the same stream as §1 Firebase ↔ GA4. When imported historical data must join with new data, map it to AE `#distinct_id` via the AE visitor-id API (`setDistinctId` / `identify`, name varies by SDK — read the wiki main doc) once at init, before any event; see `mapping-framework.md` §4.
- `setAnalyticsCollectionEnabled(bool)` → AE's consent model is to **initialize the SDK only after the user accepts the privacy policy** (gate the AE init behind the consent check — see the AE client-SDK FAQ, e.g. `android_sdk_faq.md` / `ios_sdk_faq.md`), not an init-then-toggle switch. A runtime toggle maps to AE's runtime pause API `enableTracking` (the compliance/GDPR doc describes it as suspending all data reporting; CocosCreator's variant is `setTrackStatus(PAUSE/STOP/SAVE_ONLY/NORMAL)`) — read the exact signature from the target platform's SDK doc.
- `setConsent({...})` (React Native) → **`needs decision`**: Firebase consent is per-purpose (analytics vs ads storage, ad personalization, …), finer-grained than AE's single tracking switch. Map an analytics-storage denial to the consent-gated AE init where the semantics match; other purposes have no AE equivalent — confirm with the user.

## 4. User property mapping

| Source operation | AE method | Notes |
|---|---|---|
| `setUserProperties({ k: v })` / `setUserProperty(k, v)` | `user_set` | overwrite; defaults to `user_set`. Use `user_setOnce` when the source property is first-time-only (e.g. first_open channel) |
| numeric accumulate intent | `user_add` | only when the surrounding code reads-then-writes an increasing counter |

**Reserved user property names** (cannot be used): Firebase SDK reserves `Age`, `Gender`, `Interest`; GA4 additionally reserves `first_open_time`, `first_visit_time`, `last_deep_link_referrer`, `user_id`, `first_open_after_install`.

**User property name constraints**: ≤ 24 chars; names cannot begin with `firebase_`, `google_`, `ga_`, or `_`. Ensure the AE property name is snake_case and registered.

## 5. Super property mapping

Firebase `setDefaultEventParameters({...})` (web v8/v9, React Native, Unity) attaches default params to **every subsequent event** — they are event properties, never user properties. Map them to AE common event properties (`setSuperProperties`).

| Source operation | AE method | Notes |
|---|---|---|
| `setDefaultEventParameters({k:v})` | `set_super_properties` (`setSuperProperties({...})`) | static common event property; lands in `draft.json` `common_event_properties` |

> `setDefaultEventParameters` **accumulates** across calls, but AE `setSuperProperties` **overwrites** the whole set each call. Multiple call sites must be merged into a single `setSuperProperties` (or flagged for the user) so earlier keys are not silently dropped.

## 6. Auto-track decision

Firebase auto-collected events (not call sites) — map or drop:

| Firebase auto-track | Decision |
|---|---|
| `session_start` | drop (AE `ta_app_start` / `ta_page_show` cover lifecycle; confirm with user) |
| `first_open` | map to AE `ta_app_install` switch |
| `screen_view` | map to AE `ta_page_show` switch (web) or drop on native (AE `ta_app_view` optional) |
| `app_remove`, `app_update` | drop |
| `app_clear_data`, `app_exception`, `app_store_refund`, `os_update`, `ad_*`, `notification_*`, `dynamic_link_*` | drop (no AE auto-track equivalent) |
| `in_app_purchase` | map to an AE payment event (auto-collected, but revenue must become a `track()` with a **custom** amount property, e.g. `amount` — never a `#`-prefixed name: `#amount` is NOT a valid AE preset property and is rejected at ingestion, see `references/ae-preset-properties.md`) |

Enable the chosen AE auto-track via the SDK init switch (see `ae-generate-tracking-code`), never as manual `track()`.

## 7. Dependency identifiers

| Platform | Remove in `switch` mode | Notes |
|---|---|---|
| Web v8 | `firebase/app`, `firebase/analytics` | also the global `firebase.analytics` usage |
| Web v9 | `firebase/analytics` | keep `firebase/app` only if used elsewhere |
| Android | `com.google.firebase:firebase-analytics` | Gradle dependency |
| iOS | `Firebase/Analytics` (CocoaPods) / `FirebaseAnalytics` (SPM) | |
| Flutter | `firebase_analytics` | pubspec |
| React Native | `@react-native-firebase/analytics` | package.json |
| Unity | Firebase Analytics package (`.unitypackage`) | not a package-manager dependency; remove the package from the Unity project |
| C++ | `firebase::analytics` | remove the linked Firebase Analytics library from CMake / build config |

AE SDK dependency is resolved via the AE wiki (`ae-generate-tracking-code` → `references/sdk-index.md`), not here.

## 8. Official docs

- Get started: https://firebase.google.com/docs/analytics/get-started
- Web logEvent reference: https://firebase.google.com/docs/reference/js/analytics
- Android events: https://firebase.google.com/docs/analytics/android/events
- iOS events: https://firebase.google.com/docs/analytics/ios/events
- Android user properties: https://firebase.google.com/docs/analytics/android/user-properties
- iOS user properties: https://firebase.google.com/docs/analytics/ios/user-properties
- User properties: https://firebase.google.com/docs/analytics/user-properties
- Unity `FirebaseAnalytics` reference: https://firebase.google.com/docs/reference/unity/class/firebase/analytics/firebase-analytics
- C++ `firebase::analytics` reference: https://firebase.google.com/docs/reference/cpp/namespace/firebase/analytics
- Auto-collected events: https://support.google.com/firebase/answer/9234069
