# Mixpanel Adapter

> **Terminology**: 事件 = event | 属性 = event property | 用户 ID = distinct id | 用户属性 = people property | 公共属性 = super property | 分组 = group | 自动采集 = autotrack

## 1. Recognition

Official Mixpanel SDKs (verified against `docs.mixpanel.com`): **JavaScript**, **Node.js**, **Python**, **Go**, **Java**, **Ruby**, **PHP**, **Android**, **iOS**, **Swift**, **React Native**, **Flutter**, **Unity**.

- **Client SDKs** (persistent identity via `identify`): JavaScript, Android, iOS, Swift, React Native, Flutter, Unity.
- **Server SDKs** (identity passed per call as `distinct_id` first argument): Node.js, Python, Go, Java, Ruby, PHP.

### Client (JavaScript — `mixpanel-browser`)

| Call kind | Signature |
|---|---|
| init | `mixpanel.init('TOKEN')` |
| event | `mixpanel.track('event_name', { prop: value })` |
| identity | `mixpanel.identify('distinct_id')` |
| alias | `mixpanel.alias('new_id')` |
| reset | `mixpanel.reset()` |
| super props | `mixpanel.register({ k: v })` / `register_once({ k: v })` / `unregister('k')` |
| opt out | `mixpanel.opt_in_tracking()` / `opt_out_tracking()` / `has_opted_out_tracking()` |
| duration | `mixpanel.time_event('event_name')` (start timer, then `track`) |
| link / form | `mixpanel.track_links('#id', 'event_name')` / `track_forms('#id', 'event_name')` |
| grouped event | `mixpanel.track_with_groups('event_name', props, { group_key: 'group_type' })` |
| group | `mixpanel.get_group('group_type').set('group_key', value)` |
| group ops | `mixpanel.add_group('group_type', 'key')` / `set_group('group_type', 'key')` / `remove_group('group_type', 'key')` |
| people props | `mixpanel.people.set({ k: v })` / `.set_once` / `.increment` / `.append` / `.union` / `.remove` / `.unset` / `.track_charge` / `.clear_charges` / `.delete_user` |

### Client (native — Android / iOS / Swift / React Native / Flutter / Unity)

| Platform | Init | Event | Identity | User props | Group / opt-out |
|---|---|---|---|---|---|
| Android (Kotlin) | `MixpanelAPI.getInstance(context, token)` | `mixpanel.track("event", JSONObject)` | `mixpanel.identify("id")` / `alias(id, distinctId)` | `mixpanel.people.set(props)` | `getGroup/setGroup/addGroup/removeGroup`, `optOutTracking()`/`optInTracking()`, `timeEvent(name)`, `registerSuperProperties(props)`, `reset()` |
| iOS (ObjC/Swift) | `Mixpanel.mainInstance()` | `mixpanel.track(event: "event", properties: props)` | `mixpanel.identify(distinctId: "id")` / `alias(...)` | `mixpanel.people.set(properties:)` | `getGroup/setGroup/addGroup/removeGroup`, `optOutTracking()`/`optInTracking()`, `time(event:)`, `registerSuperProperties(...)`, `reset()` |
| Swift | `Mixpanel.initialize(token:)` | `mixpanel.track(event:properties:)` | `mixpanel.identify(distinctId:)` | `mixpanel.people.set(...)` | same group / opt-out / reset surface as iOS |
| React Native | `mixpanel.init('TOKEN')` | `mixpanel.track('event', props)` | `mixpanel.identify('id')` / `alias` | `mixpanel.people.set(props)` | `getGroup/setGroup/addGroup/removeGroup`, `optInTracking/optOutTracking`, `timeEvent`, `registerSuperProperties`, `reset`, `setLoggingEnabled` |
| Flutter | `mixpanel.init('TOKEN')` | `mixpanel.track('event', props)` | `mixpanel.identify('id')` | `mixpanel.people.set(props)` | `getGroup/setGroup/addGroup`, `optInTracking/optOutTracking`, `timeEvent`, `registerSuperProperties`, `reset`, `autocapture` |
| Unity (C#) | `Mixpanel.Init(token)` | `Mixpanel.Track("event", props)` | `Mixpanel.Identify("id")` / `Alias` | `Mixpanel.People.Set(props)` | `OptInTracking()/OptOutTracking()`, `Reset()` |

### Server (identity passed per call as `distinct_id`)

| Language | Init | Event | User props | Group |
|---|---|---|---|---|
| Node.js | `mixpanel.init('TOKEN')` | `mixpanel.track('event', props)` | `mixpanel.people.set('distinct_id', props)` | `mixpanel.groups.set('type', 'key', props)` |
| Python | `mp = Mixpanel('TOKEN')` | `mp.track(distinct_id, 'event', props)` | `mp.people_set(distinct_id, props)` / `people_set_once` / `people_increment` / `people_append` / `people_union` | `mp.group_set(type, key, props)` / `group_set_once` / `group_union` / `group_unset` / `group_remove` |
| Go | `client := mixpanel.NewApiClient(token)` | `client.Track([]*mixpanel.Event{...})` | people / groups via the same API surface | `mixpanel.Groups` |
| Java | `MixpanelAPI mixpanel = MixpanelAPI.getInstance(token)` | `mixpanel.track(distinctId, event, props)` | `mixpanel.getPeople().set(distinctId, props)` | group methods on `MixpanelAPI` |
| Ruby | `tracker = Mixpanel::Tracker.new(token)` | `tracker.track(distinct_id, 'event', props)` | `tracker.people.set(distinct_id, props)` | group methods on `tracker` |
| PHP | `$mp = Mixpanel::getInstance(token)` | `$mp->track(distinct_id, 'event', props)` | `$mp->people->set(distinct_id, props)` | `$mp->groups->set(type, key, props)` |

Server-side also expose `import_data` (batch historical import) and `alias(alias, distinct_id)`.

## 2. Event mapping rules

> **Forward compatibility**: preserve event/property names verbatim (skip snake_case — AE matches names case-sensitively) when historical Mixpanel data has been (or will be) imported into AE offline and must join with new SDK data; transform only hard-constraint violations, matching the names the offline import used. See `mapping-framework.md` §1.

- `track(name, props)` → `track(snake_case(name), props)`. Server SDKs drop the leading `distinct_id` argument — it becomes identity (§3), not a property.
- Reserved prefixes: `$` marks Mixpanel special/reserved properties (`$os`, `$browser`, `$device`, `$current_url`, `$distinct_id`, `$user_id`, `$time`, ...) and `mp_` is Mixpanel-reserved (`mp_country_code`, `mp_lib`, ...). Map `$` special properties to AE `#` preset properties (never custom) — but only to names in the authoritative AE list (`references/ae-preset-properties.md`); for `mp_` names and any `$` name without an AE preset equivalent, surface the rename to the user for confirmation (fall back to a normal custom property or drop, never a made-up `#` name).
- Property types inferred per `mapping-framework.md`; Mixpanel allows nested objects and arrays → AE `object` / `array_row` / `array_string`.

## 3. Identity mapping

- Client `identify(distinct_id)` → AE `login(accountId)` (account_id_source `user_account`).
- Server SDKs: the `distinct_id` first argument on every `track` / `people_*` / `group_*` call → AE per-event `#account_id` / account_id_source, not a client `login()` call.
- `alias(new_id)` (client) / `alias(alias, distinct_id)` (server) merges anonymous → identified; AE handles this via `login`, ignore `alias`.
- Anonymous `distinct_id` (auto-generated) → AE visitor (SDK-managed), do not migrate as `login`. **Forward compatibility**: map it to AE `#distinct_id` via the AE visitor-id API (`setDistinctId` / `identify`) once at init, before any event; see `mapping-framework.md` §4.
- `reset()` clears the device identity and starts a new anonymous user → AE `logout()` (clears `login` state, returns to visitor). Do not migrate as `login`.
- Group APIs (`get_group` / `add_group` / `set_group` / `remove_group`, `track_with_groups`, server `group_*`) have no AE group concept. Map the group key to a user property or the AE account/role system; **mark `needs decision`** and ask the user.
- `opt_in_tracking()` / `opt_out_tracking()` / `has_opted_out_tracking()` (web) / `optInTracking()` / `optOutTracking()` (native) → AE's consent model is to **initialize the SDK only after the user accepts the privacy policy** (gate the AE init behind the consent check — see the AE client-SDK FAQ, e.g. `android_sdk_faq.md` / `ios_sdk_faq.md`), not an init-then-toggle switch. A runtime opt-out toggle maps to AE's runtime pause API `enableTracking` (the compliance/GDPR doc describes it as suspending all data reporting; CocosCreator's variant is `setTrackStatus(PAUSE/STOP/SAVE_ONLY/NORMAL)`) — read the exact signature from the target platform's SDK doc; `has_opted_out_tracking()` is a read, no AE call to emit.

## 4. User property mapping

| Mixpanel people operation | AE method | Notes |
|---|---|---|
| `people.set({k:v})` / `people_set` | `user_set` | overwrite |
| `people.set_once({k:v})` / `people_set_once` | `user_setOnce` | first-write-wins |
| `people.increment({k:n})` / `people_increment` | `user_add` | numeric accumulate |
| `people.append(k, v)` / `people_append` | `user_append` | array append |
| `people.union(k, [v...])` / `people_union` | `user_append` | set-union → array append, note the dedup difference |
| `people.unset([k...])` / `people_unset` | `user_unset` | remove property |
| `people.remove(k, v)` / `people_remove` | `needs decision` | list-item removal has no direct AE equivalent; map to `user_set` with the full remaining array or mark `needs decision` |
| `people.track_charge(amount, props)` | `needs decision` | AE models revenue as events, not user properties; map to a payment event with **custom** amount + currency properties (e.g. `amount` numeric, `currency` ISO 4217 string) — `#amount` / `#currency` are NOT valid AE preset properties (they are rejected at ingestion), so never emit `#`-prefixed money names; or `user_add` on a revenue counter |
| `people.clear_charges()` | drop | resets Mixpanel's revenue counter; no AE equivalent needed |
| `people.delete_user()` / `people_delete` | `needs decision` | AE has no SDK-side user deletion; deleting a user is a server-side / admin action in AE |

> `user_append` / `user_unset` are code-level only — they do not enter the AE plan (`update_type` is `user_set` / `user_setOnce` / `user_add`); see `mapping-framework.md` §5.

## 5. Super property mapping

Mixpanel super properties (web `register` / `register_once` / `unregister`; native `registerSuperProperties`) attach to **every event** — they are event properties, never user properties. Map them to AE common event properties (`setSuperProperties`).

| Source operation | AE method | Notes |
|---|---|---|
| `register({k:v})` / `registerSuperProperties({k:v})` | `set_super_properties` (`setSuperProperties({...})`) | static common event property; lands in `draft.json` `common_event_properties` |
| `register_once({k:v})` | `needs decision` | AE has no first-write-wins common property; `setSuperProperties` overwrites |
| `unregister('k')` | `needs decision` | AE has no single-key removal; closest is one `setSuperProperties` with the remaining keys |

> `register` **accumulates** across calls, but AE `setSuperProperties` **overwrites** the whole set each call. Multiple `register` call sites must be merged into a single `setSuperProperties` (or flagged for the user) so earlier keys are not silently dropped.

## 6. Auto-track decision

Mixpanel's autotrack (web page views, clicks, forms) is opt-in:

| Source autotrack | Decision |
|---|---|
| page view (`$pageview`) | map to AE `ta_page_show` switch |
| click / form events | drop or map to AE auto-track switches per user decision |
| `$` special properties | map to AE `#` preset properties, never create as custom |
| Flutter / RN `autocapture` | drop the flag; enable the equivalent AE auto-track switches via init instead |

Enable via the AE SDK init switch, never as manual `track()`.

## 7. Dependency identifiers

| Platform | Remove in `switch` mode | Notes |
|---|---|---|
| Web | `mixpanel-browser` | npm |
| Node | `mixpanel` | npm |
| Python | `mixpanel` | pip |
| Go | `github.com/mixpanel/mixpanel-go` | Go module |
| Java (server) | `com.mixpanel:mixpanel-java` | Maven/Gradle |
| Ruby | `mixpanel-ruby` | gem |
| PHP | `mixpanel/mixpanel-php` | Composer |
| Android | `com.mixpanel.android:mixpanel-android` | Gradle |
| iOS / Swift | `Mixpanel` (CocoaPods/SPM) | |
| React Native | `mixpanel-react-native` | npm |
| Flutter | `mixpanel_flutter` | pubspec |
| Unity | Mixpanel Unity package | remove from the Unity project |

AE SDK dependency is resolved via the AE wiki (`ae-generate-tracking-code` → `references/sdk-index.md`), not here.

## 8. Official docs

- Docs portal: https://docs.mixpanel.com/docs
- SDK list: https://docs.mixpanel.com/docs/tracking-methods/sdks
- JavaScript SDK: https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript
- Node.js: https://docs.mixpanel.com/docs/tracking-methods/sdks/nodejs
- Python: https://docs.mixpanel.com/docs/tracking-methods/sdks/python
- Go: https://docs.mixpanel.com/docs/tracking-methods/sdks/go
- Java: https://docs.mixpanel.com/docs/tracking-methods/sdks/java
- Ruby: https://docs.mixpanel.com/docs/tracking-methods/sdks/ruby
- PHP: https://docs.mixpanel.com/docs/tracking-methods/sdks/php
- Android: https://docs.mixpanel.com/docs/tracking-methods/sdks/android
- iOS: https://docs.mixpanel.com/docs/tracking-methods/sdks/ios
- Swift: https://docs.mixpanel.com/docs/tracking-methods/sdks/swift
- React Native: https://docs.mixpanel.com/docs/tracking-methods/sdks/react-native
- Flutter: https://docs.mixpanel.com/docs/tracking-methods/sdks/flutter
- Unity: https://docs.mixpanel.com/docs/tracking-methods/sdks/unity
- Identity management: https://docs.mixpanel.com/docs/tracking-methods/id-management
