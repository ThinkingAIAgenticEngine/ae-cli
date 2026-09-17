# Mapping Framework (provider-agnostic)

> **Terminology**: 映射 = mapping | 事件名 = event name | 属性 = property | 类型推断 = type inference | 去重 = dedup | 公共属性提升 = super-property promotion | 用户身份 = user identity | 蛇形命名 = snake_case

This file is the generic algorithm. Provider differences live in `references/providers/<provider>.md`. The algorithm consumes `scan.json` (from Phase 1) and produces `mapping.json` + `.ae-cli/draft.json` (Phase 2).

## 1. Event name → snake_case

> **Naming policy — decide once per run**: ask whether historical source-platform data has been (or will be) imported into AE **offline** and must join with new SDK data. The offline import is outside this skill (data-migration implementation); this skill only switches the live SDK — it preserves names so new events join the imported data.
>
> - **Forward compatibility required** → preserve event / property / user-property names **verbatim** (AE matches names case-sensitively, so renaming splits the event stream). Transform a name only if it violates AE hard constraints (starts with a digit, contains characters outside `[A-Za-z0-9_]`, exceeds the length cap); any such transform must match the naming the offline import used (one shared mapping table — this skill produces it and applies it to the SDK code only).
> - **Greenfield (no historical data)** → apply steps 1–7 below.

**Special characters & reserved prefixes** (apply after the naming policy above):

- **`$` prefix** (Sensors Data preset events/properties; Mixpanel special properties): SDK-provided, not custom. Preset properties → AE `#` preset properties; preset events → AE auto-track or drop (adapter's Auto-track decision table). Never rename `$name` into a custom `_name`. **Only map to `#` names in the authoritative list** (`references/ae-preset-properties.md`); a `$` property with no AE preset equivalent becomes a normal custom property (snake_case) or is dropped — never a made-up `#` name — and is surfaced to the user for confirmation.
- **Other reserved prefixes** — Mixpanel `mp_`; Amplitude `[Amplitude]` (case-insensitive); Firebase/GA4 `_`, `firebase_`, `ga_`, `google_`, `gtag.`: cannot be custom names. Strip the prefix and flag for user confirmation (adapter §2).
- **Any other special character** in a custom event / property / user-property name (space, `-`, `.`, brackets, etc.) violates the AE charset. Normalize it (replace with `_`, collapse repeats, strip) and **always surface the rename to the user for confirmation** — a wrong normalization silently changes the metric name.

1. Apply the provider adapter's reserved-prefix/word rules (e.g. Firebase `firebase_`, `google_`, `ga_`; GA4 `_`, `gtag.`; Mixpanel `mp_`; Amplitude `[Amplitude]` — case-insensitive): strip the prefix and flag the rename for user confirmation. Do this **first**, before any other transform, so a prefix containing special characters (`gtag.`, `[Amplitude]`) is removed intact rather than mangled by step 5.
2. Convert camelCase / PascalCase boundaries to underscores: `userLogin` → `user_login`, `SELECT_CONTENT` → `select_content`, `addPaymentInfo` → `add_payment_info`.
3. Lowercase.
4. Replace spaces and hyphens with underscores.
5. Strip characters outside `[a-z0-9_]`; collapse repeated underscores.
6. Ensure the result starts with a letter; if it starts with a digit, prefix `e_`.
7. AE plan rules still apply: `snake_case`, non-empty `display_name` in the user's language, `event_tag` set per the plan skill conventions.

## 2. Property type inference

From the literal value at the call site (or the variable's usage when resolvable):

| Observed value | AE type |
|---|---|
| integer / float | `number` |
| `true` / `false` | `bool` |
| string | `string` |
| Date object (`new Date()`, a `Date` variable used directly) | `datetime` — inferred silently, unambiguous |
| ISO-8601 string (e.g. `"2024-09-01T12:00:00Z"`, `"2024-09-01"`) | `datetime` — **flag for confirmation** (string shapes are ambiguous: `order_no: "20240901123"`, `version: "2024.1"` look identical) |
| numeric field whose name suggests time (`*_time`, `*_at`, `*_ts`, `timestamp`, `*_date`) | `datetime` — **flag for confirmation** (name heuristic only; the field may be a duration or count) |
| array of primitives (strings) | `array_string` |
| plain object `{...}` | `object` |
| array of objects `[{...}]` | `array_row` |
| mixed | default `string`, flag as severe (see §3, rule 1) |
| unresolved variable | infer from the property **name**: numeric-sounding names (`amount`, `price`, `total`, `cost`, `count`, `quantity`, `duration`, or any `*_count` / `*_num` / `*_sum`) → `number`; otherwise `string`. Flag for confirmation in Phase 2. |

`datetime` is the only AE type inferred from a **shape/name heuristic** whose wrong guess silently drops or mangles data at ingestion. Every `datetime` inference except a literal `Date` object must therefore be **flagged for user confirmation in Phase 2**, exactly like `mixed` and `unresolved variable` above. Never silently assign `datetime` to a string or numeric field.

Object spread in a property argument (`track('e', { ...baseProps, amount: 9.99 })`): infer the **visible** keys normally; the spread's keys are not visible at the call site. Record the visible keys, and flag the spread for Phase 2 confirmation — resolve `baseProps` to its definition where visible, otherwise ask the user what keys it contributes (and their types).

Nested objects: `array_row` children use `parent.child` sub-property naming per the AE plan schema.

## 3. Dedup and promotion

1. Same property name across events must share one type; conflicting types → flag as severe (AE discards mismatched data), ask the user.
2. A property appearing on **3 or more events** → promote to a common event property (super property). Rationale matches `ae-generate-tracking-plan`: business-wide global dimensions belong on every event.
3. AE preset properties (`#` prefix, e.g. `#device_id`, `#os`) are never created or promoted; they are SDK-provided. Only names in the authoritative list (`references/ae-preset-properties.md`) are valid `#` properties — any other `#` name is rejected at ingestion, so never invent one. System fields (`#distinct_id`, `#account_id`, `#user_id`, `#event_name`, `#time`) are not properties at all.

## 4. Identity mapping

AE uses a three-ID model: `#distinct_id` (visitor ID, anonymous state), `#account_id` (account ID, logged-in state), and `#user_id` (backend-generated; derived from `#account_id` first, else `#distinct_id`). Map the source's two identity layers separately:

| Source identity | AE target | How |
|---|---|---|
| Logged-in user id (`setUserId` / `identify` / `login`) | `#account_id` | client: `login(accountId)`; server: per-event `#account_id` param |
| Anonymous/device id (auto `distinct_id` / `app_instance_id` / `client_id` / `device_id`) | `#distinct_id` | AE visitor-id API (`setDistinctId` / `identify`, name varies by SDK — read the wiki main doc), **only** when forward compatibility must match the imported `#distinct_id`; otherwise leave SDK-managed |
| No identity call | `account_id_source = "none"` (guest) | leave visitor id SDK-managed |

Rules:

- Client SDKs expose a global setter → `login(accountId)` (account_id_source `user_account`). Server SDKs pass identity per event → per-event `#account_id` + account_id_source, **not** `login()`.
- **Visitor-id timing**: `setDistinctId` / `identify` must run immediately after SDK init and **before any event is uploaded**; re-setting it after upload causes user-matching failures / duplicate users. It is a one-time startup call, unlike `login()`.
- `reset()` / `remove()` (source) → AE `logout()` (clears account id, returns to visitor). `logout()` only on explicit sign-out / account deletion, never on app close.
- `alias` (source anonymous→identified merge) → ignore; AE `login()` already merges visitor → account.
- Group/role identifiers → `needs decision` (AE has no direct group concept).
- **Forward compatibility**: the offline-imported `#distinct_id` and the SDK-set visitor id must be byte-identical for old and new data to join into one `#user_id`.

## 5. User property mapping

Use the provider adapter's operation table. Defaults:

- overwrite intent → `user_set`
- first-time-only intent → `user_setOnce`
- numeric accumulate intent → `user_add`
- array append → `user_append`
- remove → `user_unset`
- Property-name policy follows §1 (preserve verbatim when forward compatibility is required).

`user_append` / `user_unset` are **code-level only**: the AE plan's `user_properties[].update_type` enum has only `user_set` / `user_setOnce` / `user_add`, so these two never enter `draft.json`. They stay in `mapping.json` `ae_call` and Phase 4 emits them directly as the AE SDK's `userAppend` / `userUnset` call (read the real API signature from the wiki main doc — never guess). In `draft.json` the property's `update_type` is written as `user_set` (placeholder).

## 6. Super property (common event property) mapping

Third-party common-property APIs attach properties to **every event** (they are event properties, never user properties): Mixpanel `register` / `registerSuperProperties`, Sensors Data `register` / `registerSuperProperties`, Firebase `setDefaultEventParameters`. Map them to the AE **static** common event property `setSuperProperties({...})`.

- `register({k:v})` / `registerSuperProperties({k:v})` / `setDefaultEventParameters({k:v})` → `set_super_properties` (`setSuperProperties({...})` at Phase 4), and the properties land in `draft.json`'s `common_event_properties` pool (name / `display_name` / type / `source: "codebase"`), exactly like event properties.
- **Overwrite semantics**: AE `setSuperProperties` overwrites the whole common-property set each call, while third-party `register` **accumulates**. If the source calls `register` multiple times at different points, merge them into a single `setSuperProperties` (or flag for user confirmation) rather than emitting several overwriting calls that would drop earlier keys.
- **No 1:1 equivalent** → `needs decision`:
  - Mixpanel `register_once({k:v})` — AE has no "first-write-wins" common property; `setSuperProperties` overwrites, so either accept the relaxed semantics or mark `needs decision`.
  - Mixpanel `unregister('k')` — AE has no single-key removal; closest is one `setSuperProperties` with the remaining keys, or exclude the key in a dynamic super property; mark `needs decision`.
- **AE dynamic common properties** (`setDynamicSuperProperties(fn)`, Android `setDynamicSuperPropertiesTracker`) have **no third-party equivalent** — do not map them from a source call. Offer them only as an optional enhancement when the source computes a common-property value at runtime per event (Phase 4, user decision).
- Property-name policy follows §1 (preserve verbatim when forward compatibility is required); types follow §2.
- Amplitude and GA4 have **no** common-property API — their `setUserProperties` / `gtag('set', 'user_properties', ...)` are **user** properties (§5), never super properties.

## 7. Platform assignment (client / server)

- Call site in app/frontend code (client SDK import) → `platform: "client"`.
- Call site in backend code (server SDK import) → `platform: "server"`.
- Same event logged from both → `platform: "both"` (timestamps must sync).

## 8. Outputs

- `mapping.json`: one entry per source call site — `{ site, source_call, ae_event | ae_call, ae_props, mode, action }`. Event entries carry `ae_event` + `ae_props` (property-name → type map); identity, user-property, and super-property entries carry `ae_call` instead of `ae_event`, and user-property / super-property entries still carry `ae_props` (the full schema is in `ir.md` §mapping.json). `mode` (`switch` | `add`) is the run-level default; the per-entry `action` (`replace` | `add_after` | `add_before`) is authoritative, so a staged/mixed run can diverge per entry — the source SDK dependency is removed only when `mode` = `switch` and every entry is `replace`.
- `.ae-cli/draft.json`: the AE plan schema (`events` / `event_properties` / `common_event_properties` / `user_properties` + `meta`), identical to what `ae-generate-tracking-plan` produces, so its `tracking plan draft` / `validate` / `upload` commands consume it unchanged.
