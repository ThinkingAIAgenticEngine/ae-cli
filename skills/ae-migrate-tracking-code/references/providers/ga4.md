# Google Analytics 4 (gtag.js) Adapter

> **Terminology**: 事件 = event | 参数 = event parameter | 用户属性 = user property | 用户 ID = user id | 自动采集 = enhanced measurement | 保留前缀 = reserved prefix | 服务端上报 = Measurement Protocol

## 1. Recognition

### Web (gtag.js)

| Call kind | Signature |
|---|---|
| init | `gtag('js', new Date())` then `gtag('config', 'G-XXXXXXX', { ... })` |
| event | `gtag('event', 'event_name', { param: value })` |
| user id | `gtag('set', 'user_id', 'id')` or `gtag('config', 'G-XXXXXXX', { user_id: 'id' })` |
| user properties | `gtag('set', 'user_properties', { k: { value: v } })` |
| consent | `gtag('consent', 'default', { ... })` |

### dataLayer variant

- `dataLayer.push({ 'event': 'event_name', param: value })` — the same events pushed through a plain JS array; recognize `dataLayer` pushes alongside `gtag` calls.
- **`dataLayer` is a shared GTM data bus, not a GA4-only pipe.** A single `dataLayer.push` is typically consumed by **multiple tags in the GTM container** — the GA4 tag plus non-GA4 tags (Google Ads conversion, remarketing/audience, Meta Pixel, other vendor tags). Unlike `gtag('event', ...)` (GA4-exclusive), a `dataLayer.push` is therefore **ambiguous in ownership**. In `switch` mode, do not delete a `dataLayer.push` assuming it only feeds GA4: confirm first that no other GTM tag depends on it. When that cannot be confirmed, keep the `dataLayer.push` and treat the site as `add` mode (add `ta.track(...)` alongside) rather than deleting it.

### Server (Measurement Protocol)

- Not a SDK — raw HTTP POST to `https://www.google-analytics.com/mp/collect?measurement_id=G-XXX&api_secret=SECRET` with body `{ client_id, user_id, events: [{ name, params }] }`.

### GA4 ↔ Firebase Analytics

GA4 is Firebase Analytics' web layer — a single measurement ID is both a GA4 property and a Firebase project. In a project where `gtag(...)` (GA4) and `logEvent(...)` (Firebase) coexist, they are **one data stream, not two providers**: merge them into a single migration run (see SKILL.md Phase 0) producing one scan / one `draft.json` / one `mapping.json`. Do not migrate them as two separate providers.

## 2. Event mapping rules

> **Forward compatibility**: preserve event/property names verbatim (skip snake_case — AE matches names case-sensitively) when historical GA4 data has been (or will be) imported into AE offline and must join with new SDK data; transform only hard-constraint violations, matching the names the offline import used. See `mapping-framework.md` §1.

- `gtag('event', name, params)` / `dataLayer.push({event: name, ...})` → `track(snake_case(name), params)`.
- **Event name constraints**: ≤ 40 chars; only alphanumeric + underscore; must start with a letter; ≤ 25 params; param name ≤ 40 chars; param value ≤ 100 chars.
- **Reserved prefixes** — event, parameter, and user-property names cannot begin with `_` (leading underscore), `firebase_`, `ga_`, or `google_`; parameter names additionally cannot begin with `gtag.`. Strip the prefix and flag for user confirmation.
- **Reserved param name**: `firebase_conversion` is the only fully-reserved parameter name (cannot be used at all). Auto-collected / system parameters — `engagement_time_msec`, `gclid`, `session_id`, `session_number` — also must not be redefined as custom parameters: drop or map per user decision.
- **Reserved event names** (cannot be used as custom events): `ad_activeview`, `ad_click`, `ad_exposure`, `ad_query`, `ad_reward`, `adunit_exposure`, `app_clear_data`, `app_exception`, `app_install`, `app_remove`, `app_store_refund`, `app_update`, `app_upgrade`, `dynamic_link_app_open`, `dynamic_link_app_update`, `dynamic_link_first_open`, `error`, `first_open`, `first_visit`, `in_app_purchase`, `notification_dismiss`, `notification_foreground`, `notification_open`, `notification_receive`, `os_update`, `screen_view`, `session_start`, `user_engagement`.
- **Recommended event names** (GA4-predefined — custom events must not reuse them): `click`, `file_download`, `form_start`, `form_submit`, `scroll`, `view_complete`, `video_progress`, `video_start`, `view_search_results`, `sign_up`, `login`, and more. Route both sets to Section 5 auto-track decisions, never to manual `track()`; see the events reference for the full list.
- `gtag('set', 'user_properties', ...)` / `gtag('config', ..., { user_id })` are config calls, not events — map to identity / user property per Sections 3–4, not `track`.

## 3. Identity mapping

- `gtag('set', 'user_id', id)` / `gtag('config', 'G-XXX', { user_id: id })` → AE `login(accountId)` (account_id_source `user_account`).
- Measurement Protocol `user_id` field → same mapping.
- **Forward compatibility**: GA4's auto anonymous id is `client_id`. When imported historical data must join with new data, map it to AE `#distinct_id` via the AE visitor-id API (`setDistinctId` / `identify`) once at init, before any event; see `mapping-framework.md` §4.
- `gtag('consent', 'default', {...})` → **`needs decision`**: GA4 consent is per-purpose (`analytics_storage`, `ad_storage`, …), finer-grained than AE's single tracking switch. AE's consent model is to **initialize the SDK only after the user accepts the privacy policy** (gate the AE init behind the consent check — see the AE client-SDK FAQ, e.g. `android_sdk_faq.md` / `ios_sdk_faq.md`). Map an `analytics_storage: denied` default to that gated init where the semantics match; `ad_storage` and other purposes have no AE equivalent — confirm with the user.

## 4. User property mapping

| Source operation | AE method | Notes |
|---|---|---|
| `gtag('set', 'user_properties', {k:{value:v}})` | `user_set` | overwrite; use `user_setOnce` when first-time-only |

> GA4 / gtag.js has **no** common-property (super property) API — `gtag('set', 'user_properties', ...)` is a **user** property, not an event property attached to every event; do not map it to AE `setSuperProperties`.

**Reserved user property names** (cannot be used): `first_open_time`, `first_visit_time`, `last_deep_link_referrer`, `user_id`, `first_open_after_install` — plus the reserved-prefix rule in §2.

**User property limits**: ≤ 25 user properties; name ≤ 24 chars; value ≤ 36 chars; user-id value ≤ 256 chars.

## 5. Auto-track decision (enhanced measurement)

GA4 auto-collects these (no call sites):

| GA4 auto-track | Decision |
|---|---|
| `page_view` | map to AE `ta_page_show` switch |
| `session_start` | drop (AE `ta_app_start` / `ta_page_show` cover lifecycle) |
| `first_visit` | map to AE `ta_app_install` switch |
| `scroll`, `click`, `view_search_results`, `video_start`, `file_download`, `form_start`, `form_submit`, `user_engagement` | drop or map per user decision; most have no AE auto-track equivalent |

Enable via the AE SDK init switch, never as manual `track()`.

## 6. Dependency identifiers

| Platform | Remove in `switch` mode | Notes |
|---|---|---|
| Web | gtag.js script snippet (`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX`) + all `gtag(...)` calls | remove the `dataLayer` global **only after confirming no other GTM tag consumes it** (see §1 dataLayer variant); if in doubt, keep it |
| Server | Measurement Protocol endpoint | remove the `mp/collect` HTTP calls |

AE SDK dependency is resolved via the AE wiki (`ae-generate-tracking-code` → `references/sdk-index.md`), not here.

## 7. Official docs

- gtag.js (GA4): https://developers.google.com/analytics/devguides/collection/ga4
- gtag.js API reference: https://developers.google.com/tag-platform/gtagjs/reference
- Events reference: https://developers.google.com/analytics/devguides/collection/ga4/events
- Event parameters: https://developers.google.com/analytics/devguides/collection/ga4/event-parameters
- User properties: https://developers.google.com/analytics/devguides/collection/ga4/user-properties
- Collection limits (40/24/36 chars, 25 params / 25 user properties): https://support.google.com/analytics/answer/9267744
- Measurement Protocol (GA4): https://developers.google.com/analytics/devguides/collection/protocol/ga4
- Measurement Protocol reference (reserved names): https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
