# IR Schema (scan.json / mapping.json)

> **Terminology**: 归一化中间表示 = IR (intermediate representation) | 调用点 = call site | 扫描结果 = scan result | 映射结果 = mapping result

Migration artifacts live under `.ae-cli/migration/`. They are JSON, written by the skill at runtime and consumed by the two downstream skills.

## scan.json — extracted call sites (Phase 1 output)

```json
{
  "provider": "firebase",
  "variant": "web-v9",
  "platforms": ["web"],
  "call_sites": [
    {
      "id": "cs-1",
      "file": "src/app.js",
      "line": 42,
      "kind": "event",
      "source_call": "logEvent(analytics, 'user_login', { method: 'phone' })",
      "event_name": "user_login",
      "params": { "method": "phone" },
      "resolved": true
    },
    {
      "id": "cs-2",
      "file": "src/app.js",
      "line": 18,
      "kind": "identity",
      "source_call": "setUserId(analytics, userId)",
      "resolved": true
    },
    {
      "id": "cs-3",
      "file": "src/app.js",
      "line": 25,
      "kind": "user_property",
      "source_call": "setUserProperties(analytics, { vip_level: 'gold' })",
      "op": "set",
      "prop": "vip_level",
      "value": "gold"
    },
    {
      "id": "cs-4",
      "file": "src/app.js",
      "line": 30,
      "kind": "super_property",
      "source_call": "setDefaultEventParameters(analytics, { app_version: '1.2.3', channel: 'web' })",
      "props": { "app_version": "1.2.3", "channel": "web" }
    }
  ]
}
```

- `kind` ∈ `event` | `identity` | `user_property` | `super_property`.
- `via_wrapper` (optional, string): set on a call site resolved through an analytics wrapper function (see **Wrapper-layer resolution** below) — records the wrapper function's name. `kind` stays one of the three values above; a wrapper-resolved site is a normal call site with different provenance.
- `identity` is a **client global setter** call site (`setUserId` / `identify` / `login`). Server SDKs pass identity **per event** (Amplitude Node `{ user_id }`, GA4 Measurement Protocol `user_id`, Mixpanel server `distinct_id`): record it as a `user_id` (and/or `device_id`) field on the **`event`** call site — `kind` stays `event`, there is no separate `identity` entry (Phase 2 maps it to the AE per-event `#account_id`, see `mapping-framework.md` §4).
- `variant` is a **fixed SDK-variant token** (not the fixture/project directory name). Map the platform the adapter's Recognition section identified to one of:

  | Provider | Variant tokens |
  |---|---|
  | firebase | `web-v8`, `web-v9`, `android`, `ios`, `flutter`, `react-native`, `unity`, `cpp` |
  | amplitude | `legacy-js`, `browser-2.x`, `node`, `python`, `go`, `java`, `android`, `ios`, `react-native`, `flutter`, `unity` |
  | sensors-data | `web`, `java`, `android` |
  | mixpanel | `javascript` (browser JS), `node`, `python`, `go`, `java`, `ruby`, `php`, `android`, `ios` (incl. Swift), `react-native`, `flutter`, `unity` |
  | ga4 | `gtag-web`, `datalayer`, `mp-server` |

  New providers/platforms add their token to this table alongside their adapter. **Tokens name every documented platform, not only the tested ones** — only a subset has a regression fixture (see `test/ae-migrate-tracking-code/README.md` §Coverage). A token without a fixture is still valid: Phase 1 records it, and the mapping/naming rules apply unchanged.

- `resolved` applies to `event` and `identity` entries:
  - `event`: `true` whenever the event **name** is a known static value — a string literal, a constant resolved from the scanned source, or an external-SDK constant identifier (see the `event_name` rules below). `false` **only** when the event name itself is a runtime variable/expression that cannot be resolved to a static name (listed for user confirmation in Phase 2). Runtime **param values** (e.g. `{ amount: order.total }`) do **not** set `resolved: false` — they are recorded in `params` as the variable name and surfaced for *type* confirmation in Phase 2, not name confirmation. A name arriving as a **wrapper function's parameter** is resolved via wrapper-layer tracing (below) — business callers with a static name become `resolved: true` sites carrying `via_wrapper`; `false` is reserved for names that stay unresolved *after* tracing (dynamic names, or a wrapper with no findable callers).
  - `identity`: always `true` — the id is a runtime value, and the mapping target (`login(accountId)`) does not require resolving the id's concrete value.
- `event_name` records the name **as written in the scanned source**, and only resolves it when the value is visible in that source:
  - a string literal is recorded verbatim (`"user_login"` → `user_login`; `"userLogin"` → `userLogin` — Phase 2 §1 naming conversion does the snake_case/normalization).
  - a constant defined **in the scanned source** (e.g. `EVENT_SIGNUP = 'sign_up'`) is resolved to its value, still with `resolved: true` (the name is static).
  - a constant from an **external SDK** whose value is not visible in the source (e.g. `FirebaseAnalytics.Event.SELECT_CONTENT`) is recorded as the identifier as written (`SELECT_CONTENT`), still with `resolved: true` — it is a static name, not a runtime variable. Do **not** resolve it against SDK documentation; the downstream §1 naming conversion (UPPER_SNAKE → snake_case) yields the correct AE name.
  - **Expression shapes that are not a single static name** record `resolved: false` and are surfaced in Phase 2 for the user to expand:
    - **Ternary / conditional** (`track(cond ? 'sign_up' : 'login', ...)`): the branches are static literals but the runtime value is one of several — it is **several distinct events, not one**. Record `event_name` as the expression text as written; in Phase 2 enumerate each static branch and ask the user which (possibly all) become separate AE events.
    - **Template literal** (`` track(`click_${name}`) ``): the name is unbounded. Record the template as written; in Phase 2 ask the user whether it collapses to a finite set of names or becomes a base event + a `name` property.
- `user_property` entries carry no `resolved` field. They record `op` (`set` | `setOnce` | `add` | `append` | `unset`, mapping to AE `user_set` / `user_setOnce` / `user_add` / `user_append` / `user_unset`) plus `prop` (the user property name) and `value` (the literal value, or the variable name when not resolvable).
- `super_property` entries carry no `resolved` field. They record `props` (the full name → value map, like an `event`'s `params`; values may be variable names) — a third-party common-property call sets several properties at once (`register({...})` / `registerSuperProperties({...})` / `setDefaultEventParameters({...})`), so there is no single `prop`/`value` pair. Prop **names** are always static object-literal keys; only the **values** may be runtime variables. `super_property` sites map to AE common event properties (Phase 2 writes them into `draft.json`'s `common_event_properties` pool, Phase 4 emits `setSuperProperties({...})` in place).

**Wrapper-layer resolution** — when an SDK call's event name is a **function parameter** (a runtime variable flowing from an enclosing function's argument), Phase 1 treats that function as an analytics wrapper and traces its callers instead of recording `resolved:false` up front. A discovered wrapper `F` (e.g. `trackEvent(name, props)` → `mixpanel.track(name, props)`) is recorded in the top-level optional `wrappers` array, **not** in `call_sites`:

```json
{
  "wrappers": [
    { "name": "trackEvent", "file": "src/analytics.js", "line": 4, "source_call": "mixpanel.track(name, props)", "delegates_to": "event" }
  ]
}
```

- `delegates_to` ∈ `event` | `identity` | `user_property` | `super_property` — the SDK call kind `F` forwards to; it is the `kind` inherited by `F`'s resolved business call sites.
- The wrapper is the pivot for tracing, not a migration target: its own SDK call is not a `call_sites` entry. Each business caller becomes a normal call site carrying `via_wrapper`. `source_call` on those sites is the **caller's** invocation line (e.g. `trackEvent('sign_up', { method: user.method })`), which appears literally in the caller's file.

## mapping.json — source site → AE event (Phase 2 output)

```json
{
  "provider": "firebase",
  "variant": "web-v9",
  "mode": "switch",
  "entries": [
    {
      "site_id": "cs-1",
      "file": "src/app.js",
      "line": 42,
      "source_call": "logEvent(analytics, 'user_login', { method: 'phone' })",
      "ae_event": "user_login",
      "display_name": "User Login",
      "platform": "client",
      "ae_props": { "method": "string" },
      "action": "replace"
    },
    {
      "site_id": "cs-2",
      "file": "src/app.js",
      "line": 18,
      "source_call": "setUserId(analytics, userId)",
      "ae_call": "login(accountId)",
      "account_id_source": "user_account",
      "action": "replace"
    },
    {
      "site_id": "cs-3",
      "file": "src/app.js",
      "line": 8,
      "source_call": "getAppInstanceId()",
      "ae_call": "setDistinctId(appInstanceId)",
      "account_id_source": "none",
      "note": "forward compatibility: visitor id set once at init, before any event",
      "action": "replace"
    },
    {
      "site_id": "cs-4",
      "file": "src/app.js",
      "line": 25,
      "source_call": "setUserProperties(analytics, { vip_level: 'gold' })",
      "ae_call": "user_set",
      "ae_props": { "vip_level": "string" },
      "action": "replace"
    },
    {
      "site_id": "cs-5",
      "file": "src/app.js",
      "line": 30,
      "source_call": "setDefaultEventParameters(analytics, { app_version: '1.2.3', channel: 'web' })",
      "ae_call": "set_super_properties",
      "ae_props": { "app_version": "string", "channel": "string" },
      "action": "replace"
    }
  ]
}
```

- `mode` ∈ `switch` | `add` — the run-level default, decided once per run in Phase 2.
- `action` ∈ `replace` | `add_after` | `add_before` — set **per entry** and authoritative. `mode` is only the default an entry inherits; a `switch` run may still carry `add_after` entries (staged roll-out), and an `add` run may carry `replace` entries. The source SDK dependency is removed only on a full cut-over: `mode` = `switch` **and** every entry `action` = `replace`. A mixed run keeps the dependency — surviving `add_*` sites still call it.
- Identity entries use `ae_call` (no `ae_event`): `login(accountId)` → `#account_id`; `setDistinctId(visitorId)` / `identify(visitorId)` → `#distinct_id` (forward compatibility, init-time, before any event); `logout()` from source `reset()` / `remove()`. `account_id_source` ∈ `user_account` | `none`.
- Server event entries (identity rides per event) carry `account_id_source` (`user_account` → AE per-event `#account_id`, e.g. from the scan-side `user_id` field) **instead of** an `ae_call` — `login(accountId)` is client-only.
- User property entries use `ae_call` (no `ae_event`): `ae_call` = the AE user API (`user_set` / `user_setOnce` / `user_add` / `user_append` / `user_unset`, per the adapter's operation table), and `ae_props` = the property-name → type map, exactly like an event entry (the scan-side `op` / `prop` / `value` are not carried over — `op` becomes `ae_call`, `prop` becomes the `ae_props` key, `value` is dropped from mapping and re-emitted as the literal in the migrated code).
- Super property entries use `ae_call` (no `ae_event`): `ae_call` = `set_super_properties` (emitted as `setSuperProperties({...})` at Phase 4), and `ae_props` = the property-name → type map. The scan-side `props` map is dropped from mapping and re-emitted as the literal object in the migrated `setSuperProperties` call. These properties land in `draft.json`'s `common_event_properties` pool.

## draft.json — AE plan (Phase 2 output, consumed by ae-generate-tracking-plan)

Identical schema to `ae-generate-tracking-plan`'s draft: `meta` (sdk_integration_mode, client/server platform+language, user_identity, host/project_id as filled later) + `events[]` (each with `event_name`, `display_name`, `platform`, `prop_names`, `event_tag`, `source: "codebase"`) + `event_properties[]` / `common_event_properties[]` / `user_properties[]` pools. `source` must be one of the AE plan's `Source` enum values — events/properties extracted from existing tracking code use `"codebase"` (there is no `"migration"` source value).

**`user_append` / `user_unset` are NOT in the plan's `update_type` enum** (that enum is `user_set` / `user_setOnce` / `user_add` only). A user property mapped to `user_append` / `user_unset` keeps that value in `mapping.json` `ae_call` (Phase 4 emits the SDK call directly) but its `draft.json` `update_type` is written as `user_set` (placeholder) — the plan records that the property exists, not the append/unset semantics.
