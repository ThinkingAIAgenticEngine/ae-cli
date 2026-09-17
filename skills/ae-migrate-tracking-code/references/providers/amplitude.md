# Amplitude Adapter

> **Terminology**: 事件 = event | 属性 = event property / user property | 用户 ID = user id | 分组 = group | Identify 操作 = Identify operation | 自动采集 = auto-track

## 1. Recognition

Official Amplitude SDKs (verified against `docs.developers.amplitude.com`): **Browser (2.x)**, **Web legacy (`amplitude-js`)**, **Node.js**, **Python**, **Go**, **Java**, **Android (Kotlin)**, **iOS (Swift)**, **React Native**, **Flutter**, **Unity**. Amplitude has **no official Ruby / .NET / PHP SDK** (those are community projects — do not treat them as first-party).

### Web legacy (`amplitude-js`)

| Call kind | Signature |
|---|---|
| event | `amplitude.getInstance().logEvent('EVENT_NAME', { prop: value })` |
| identity | `amplitude.getInstance().setUserId('id')` |
| user props | `amplitude.getInstance().setUserProperties({ k: v })` |
| identify | `amplitude.getInstance().identify(new amplitude.Identify().set('k', v).add('k', n).setOnce('k', v))` |
| group | `amplitude.getInstance().setGroup('groupType', 'groupName')` |

### Browser 2.x (`@amplitude/analytics-browser`)

| Call kind | Signature |
|---|---|
| init | `amplitude.init(API_KEY, user_id?, options?)` |
| event | `amplitude.track('event_name', { prop: value })` (legacy `logEvent` deprecated) |
| identity | `amplitude.setUserId('id')` / `setDeviceId('id')` / `setSessionId(ms)` / `setIdentity(idObj)` |
| identify | `amplitude.identify(new Identify().set('k', v).add('k', n).setOnce('k', v).append('k', v).prepend('k', v).postInsert('k', v).remove('k', v).unset('k').clearAll())` |
| group | `amplitude.setGroup('groupType', 'groupName')` / `groupIdentify('groupType', 'groupName', identify)` |
| revenue | `const rev = new Revenue().setPrice(9.99).setProductId('id'); amplitude.revenue(rev)` |
| opt out | `amplitude.setOptOut(bool)` / `getOptOut()` |
| flush / reset | `amplitude.flush()` / `reset()` / `extendSession()` |
| others | `amplitude.remove()` (wipe local data), `trackVideo(...)`, `setTransport(...)`, `createInstance()` |

### React Native (`@amplitude/analytics-react-native`)

| Call kind | Signature |
|---|---|
| init | `amplitude.init(API_KEY)` |
| event | `amplitude.logEvent('event_name', { prop: value })` — **RN uses `logEvent`, not `track`** |
| identity | `amplitude.setUserId('id')` |
| user props | `amplitude.setUserProperties({ k: v })` |
| identify | `amplitude.identify(new Identify().set('k', v).add('k', n))` |
| group | `amplitude.setGroup('groupType', 'groupName')` / `groupIdentify(...)` |
| opt out | `amplitude.setOptOut(bool)` |

### Node.js (`@amplitude/analytics-node`)

| Call kind | Signature |
|---|---|
| init | `amplitude.init(apiKey, options?)` |
| event | `amplitude.track(event, eventOptions?)` — user_id / device_id ride on the event, not a global setter; `logEvent(...)` is a deprecated alias |
| identify | `amplitude.identify(new Identify().set('k', v), eventOptions?)` |
| group | `amplitude.setGroup(...)` / `groupIdentify(...)` |
| revenue | `amplitude.revenue(revenueObj, eventOptions?)` |
| flush / opt-out | `amplitude.flush()` / `setOptOut(bool)` |

### Python (`amplitude-analytics` on PyPI, `from amplitude import Amplitude`)

| Call kind | Signature |
|---|---|
| init | `amp = Amplitude(api_key=...)` |
| event | `amp.track(BaseEvent(event_type=..., user_id=..., event_properties={...}))` — `user_id` / `device_id` ride on the event, not a global setter |
| identify | `amp.identify(Identify().set('k', v), EventOptions(user_id=...), event_properties=None)` — `Identify()` is an empty constructor; identity goes on `EventOptions` |
| group | `amp.set_group(group_type, group_name, EventOptions(...))` / `group_identify(group_type, group_name, identify_obj, ...)` |
| revenue | `amp.revenue(Revenue(price=...), EventOptions(...))` |
| flush / stop | `amp.flush()` / `shutdown()` / `add(plugin)` / `remove(plugin)` |

### Go (`github.com/amplitude/analytics-go/amplitude`)

| Call kind | Signature |
|---|---|
| init | `client := amplitude.NewClient(amplitude.NewConfig("api-key"))` — `NewConfig` takes the API key |
| event | `client.Track(amplitude.Event{EventType: "...", UserID: "..."})` — one of `UserID` / `DeviceID` required |
| identify | `client.Identify(amplitude.Identify{...}, amplitude.EventOptions{UserID: ...})` |
| group | `client.SetGroup(groupType, []string{groupName}, EventOptions{...})` / `client.GroupIdentify(...)` |
| revenue | `client.Revenue(amplitude.Revenue{...}, EventOptions{...})` |
| flush / stop | `client.Flush()` / `Shutdown()` / `Add(plugin)` / `Remove(name)` |

### Java (server, `com.amplitude:java-sdk`)

| Call kind | Signature |
|---|---|
| init | `Amplitude.getInstance().init(apiKey)` |
| event | `amplitude.logEvent(new Event("event_type", userId))` — **Java server uses `logEvent`, not `track`**; `userId` / `deviceId` are `Event` constructor args (at least one required, `userId` ≥ 5 chars) |
| props / groups | `event.setEventProperties(map)` / `setUserProperties(map)` / `setGroups(map)` / `setGroupProperties(map)` |
| flush / stop | `flushEvents()` / `shutdown()`; config: `setServerUrl(...)` / `useBatchMode(...)` |

No `identify` / `setGroup` / `groupIdentify` / `revenue` client methods — the Java server SDK is `logEvent`-only; groups and revenue are set as properties on the `Event` object.

### Android (Kotlin, `com.amplitude:analytics-android`)

- `amplitude.track("event_name", mapOf("k" to v))`, `amplitude.identify(Identify().set("k", v))`, `amplitude.setUserId("id")`, `setDeviceId("id")`, `setSessionId(ms)`, `setGroup(type, name)`, `groupIdentify(...)`, `setOptOut(bool)`, `revenue(...)`, `flush()`, `reset()`, `remove()`.

### iOS (Swift, `Amplitude`)

- `amplitude.track(eventType: "event_name", eventProperties: ["k": v])`, `amplitude.identify(identify: Identify().set(property: "k", value: v))`, `amplitude.setUserId(userId: "id")`, `setDeviceId(deviceId: "id")`, `setSessionId(ms)`, `setGroup(groupType:groupName:)`, `groupIdentify(...)`, `revenue(...)`, `flush()`, `reset()`, `remove()`.

### Flutter (`amplitude_flutter`)

- `amplitude.track('event_name', {'k': v})`, `amplitude.identify(Identify()..set('k', v))`, `amplitude.setUserId('id')`, `setDeviceId('id')`, `setGroup(type, name)`, `groupIdentify(...)`, `revenue(...)`, `reset()`, `flush()`.

### Unity (legacy API — `logEvent`, not `track`)

- Init: `amplitude.init(API_KEY)`.
- Event: `amplitude.logEvent("event_name", propertiesDict)`.
- Identity: `amplitude.setUserId("id")`.
- User property: `setUserProperty("k", v)` / `setUserProperties({...})` / `setOnceUserProperty("k", v)` / `unsetUserProperty("k")` / `clearUserProperties()` / `appendUserProperty("k", [v])` / `addUserProperty("k", v)` / `addUserPropertyDict(...)`.
- Group: `setGroup("groupType", "groupName")`.
- Revenue: `logRevenue(...)`.
- Misc: `trackSessionEvents(bool)`, `setServerUrl(...)`, `setServerZone(...)`, `setEventUploadPeriodSeconds(...)`.

### Server-side → AE landing architecture

Amplitude server SDKs upload directly over HTTP. AE server SDKs default to **LoggerConsumer + LogBus2** (write to local logs → LogBus2 syncs to AE) — the reliable, no-data-loss path. `switch` mode therefore requires deploying LogBus2, not just replacing the calls. If the customer insists on direct HTTP upload and accepts the data-loss risk, use the `restful` standalone option (`ae-generate-tracking-code` → `references/restful-call.md`) — do **not** switch to BatchConsumer.

| Amplitude server SDK | AE server SDK |
|---|---|
| Node.js `@amplitude/analytics-node` | Node.js SDK |
| Python `amplitude-analytics` (PyPI) | Python SDK |
| Go `github.com/amplitude/analytics-go` | Golang SDK |
| Java `com.amplitude:java-sdk` | Java SDK |

## 2. Event mapping rules

> **Forward compatibility**: preserve event/property names verbatim (skip snake_case — AE matches names case-sensitively) when historical Amplitude data has been (or will be) imported into AE offline and must join with new SDK data; transform only hard-constraint violations, matching the names the offline import used. See `mapping-framework.md` §1.

- `logEvent(type, props)` / `track(type, props)` → `track(snake_case(type), props)`.
- Amplitude event names are free-form; convert to AE `snake_case` (lowercase, underscores, start with a letter). Amplitude convention is often PascalCase or snake_case — normalize both.
- **Reserved prefix**: Amplitude reserves property / user-property names starting with `[Amplitude]` (case-insensitive) for its internal system properties. A custom name with this prefix must be renamed (strip the prefix) and surfaced to the user for confirmation.
- Event properties: map each key to an AE property with a type inferred per `mapping-framework.md`. Amplitude allows nested objects and arrays — map objects to AE `object`, object arrays to `array_row`, string arrays to `array_string`.
- Amplitude truncates very long event/property names and has large property limits (2000 event props / 1000 user props) — no renaming needed for length, only snake_case normalization.
- `Revenue` / `revenue(...)` / `logRevenue(...)` → AE has **no payment/revenue API and no revenue auto-track event** — revenue is an ordinary event the app reports itself. Map to a user-chosen AE payment event (e.g. `pay_order` / `purchase`) via `track(...)` with **custom** `amount` (numeric) + `currency` (ISO 4217 string) properties. Never emit `#`-prefixed money names (`#amount` / `#currency` are not valid AE preset properties — rejected at ingestion). The event name and the amount/currency property names are a user decision.

## 3. Identity mapping

- Client `setUserId(id)` → AE `login(accountId)` (account_id_source `user_account`).
- Client `setDeviceId(id)` → AE visitor identity (`#distinct_id`); SDK-managed by default. **Forward compatibility**: map Amplitude's default anonymous `device_id` to AE `#distinct_id` via the AE visitor-id API (`setDistinctId` / `identify`) once at init, before any event; see `mapping-framework.md` §4. Only when the device id is a stable business id should it become `login(accountId)`.
- **Server SDKs**: user_id / device_id ride on each event (Node/Python/Go/Java) or on the `Identify` object (Python) — map to AE per-event `#account_id` / account_id_source, not a client `login()` call.
- `setSessionId(ms)` → AE session management is SDK-managed; drop.
- `reset()` / `remove()` → AE `logout()` (clear login state); `remove()` also wipes local data — treat as a hard reset, confirm with user.
- `setOptOut(bool)` → AE has no init-then-toggle switch: its consent model is to **initialize the SDK only after the user accepts the privacy policy** (the official sample code gates init behind `if (consented)` — see the AE client-SDK FAQ, e.g. `android_sdk_faq.md` / `ios_sdk_faq.md`). In `switch` mode, gate the AE init behind the same consent check rather than emitting an opt-out call. A **runtime** opt-out toggle (the user revokes consent mid-session) maps to AE's runtime pause API `enableTracking` (the compliance/GDPR doc describes it as suspending all data reporting; CocosCreator's variant is `setTrackStatus(PAUSE/STOP/SAVE_ONLY/NORMAL)`) — read the exact signature from the target platform's SDK doc; otherwise mark `needs decision`.
- `setGroup(groupType, groupName)` / `groupIdentify` → AE has no direct group concept. Map to a user property or the AE account/role system; **mark `needs decision`** and ask the user.

## 4. User property mapping

Identify operations map 1:1 to AE user property methods:

| Amplitude Identify operation | AE method | Notes |
|---|---|---|
| `set(k, v)` | `user_set` | overwrite |
| `setOnce(k, v)` | `user_setOnce` | first-write-wins |
| `add(k, n)` | `user_add` | numeric accumulate |
| `append(k, v)` | `user_append` | array append |
| `unset(k)` | `user_unset` | remove property |
| `prepend` / `preInsert` / `postInsert` / `remove` | — | no AE equivalent; map to `user_set` with the full array or mark `needs decision` |
| `clearAll()` | — | clears all pending ops in the Identify object; migrate the ops the object still contains, not the `clearAll` itself |

Legacy `setUserProperties({k: v})` (amplitude-js / RN / Unity) → `user_set`.
Unity `setOnceUserProperty(k, v)` → `user_setOnce`; `unsetUserProperty(k)` → `user_unset`; `appendUserProperty`/`addUserProperty` → `user_append`; `clearUserProperties()` → `needs decision` (no direct AE equivalent).

> Amplitude has **no** common-property (super property) API: `setUserProperties` is a **user** property, not an event property attached to every event — do not map it to AE `setSuperProperties`.

> `user_append` / `user_unset` are code-level only — they do not enter the AE plan (`update_type` is `user_set` / `user_setOnce` / `user_add`); see `mapping-framework.md` §5.

## 5. Auto-track decision

Amplitude auto-collects session start/end and (in some SDKs) screen/page views:

| Amplitude auto-track | Decision |
|---|---|
| session start | drop (AE `ta_app_start` / `ta_page_show` cover lifecycle; confirm with user) |
| session end | drop |
| page/screen view | map to AE `ta_page_show` (web) / `ta_app_view` (native) switch |
| Unity `trackSessionEvents(bool)` | drop the call; enable AE auto-track switches via init instead |

Enable via the AE SDK init switch, never as manual `track()`.

## 6. Dependency identifiers

| Platform | Remove in `switch` mode | Notes |
|---|---|---|
| Web legacy | `amplitude-js` | |
| Web 2.x | `@amplitude/analytics-browser` | |
| React Native | `@amplitude/analytics-react-native` | |
| Node | `@amplitude/node` (legacy) / `@amplitude/analytics-node` | npm |
| Python | `amplitude-analytics` (PyPI; import `amplitude`) | pip |
| Go | `github.com/amplitude/analytics-go` | Go module |
| Java | `com.amplitude:java-sdk` | Maven/Gradle |
| Android | `com.amplitude:analytics-android` | Gradle |
| iOS | `Amplitude` (SPM/CocoaPods) | |
| Flutter | `amplitude_flutter` | pubspec |
| Unity | Amplitude Unity package (`.unitypackage`) | not a package-manager dependency; remove from the Unity project |

AE SDK dependency is resolved via the AE wiki (`ae-generate-tracking-code` → `references/sdk-index.md`), not here.

## 7. Official docs

- SDK overview: https://www.docs.developers.amplitude.com/data/sdks/
- Browser 2.x: https://www.docs.developers.amplitude.com/data/sdks/browser-2/
- Node.js: https://www.docs.developers.amplitude.com/data/sdks/node/
- Python: https://www.docs.developers.amplitude.com/data/sdks/python/
- Go: https://www.docs.developers.amplitude.com/data/sdks/go/
- Java: https://www.docs.developers.amplitude.com/data/sdks/java/
- Android (Kotlin): https://www.docs.developers.amplitude.com/data/sdks/android-kotlin/
- iOS: https://www.docs.developers.amplitude.com/data/sdks/ios/
- React Native: https://www.docs.developers.amplitude.com/data/sdks/react-native/
- Flutter: https://www.docs.developers.amplitude.com/data/sdks/flutter/
- Unity: https://www.docs.developers.amplitude.com/data/sdks/unity/
- Server SDK source (API verified): https://github.com/amplitude/Amplitude-TypeScript (Node), https://github.com/amplitude/Amplitude-Python, https://github.com/amplitude/analytics-go, https://github.com/amplitude/Amplitude-Java
