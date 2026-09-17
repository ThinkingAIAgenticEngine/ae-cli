# Provider Adapter Contract

> **Terminology**: 适配器 = adapter | 识别模式 = recognition pattern | 映射 = mapping | 依赖标识 = dependency identifier | 自动采集 = auto-track | 保留字 = reserved word/prefix

A provider adapter is a single Markdown file `references/providers/<provider>.md`. It carries **only** the provider-specific knowledge the migration engine needs. The core algorithm lives in `mapping-framework.md` and must stay provider-agnostic.

## How to add a new provider

1. Copy `firebase.md` as a template.
2. Fill every section below.
3. Add one row to the Provider Registry table in `SKILL.md`.
4. Do **not** modify `SKILL.md` phases or `mapping-framework.md`.

## Required sections

### 1. Recognition

How to detect the provider and pin its version variant. Include:

- Import / dependency signatures (web, Android, iOS, Flutter/RN where relevant).
- The exact call signatures for each call kind (event / identity / user property).
- Version variants and how to tell them apart (e.g. Firebase v8 namespaced vs v9 modular; Amplitude legacy `getInstance().logEvent` vs 2.x `amplitude.track`).

### 2. Event mapping rules

- The event call → AE `track()` shape.
- Event-name constraints (max length, allowed charset, must start with letter) and reserved prefixes that must be stripped or renamed before snake_case conversion.
- Params/properties: max count, max name/value length, and how non-literal values (variables) are resolved.
- How source auto-track events are treated (mapped to AE `ta_*` switches or dropped).

### 3. Identity mapping

Source identity call(s) → AE `login(accountId)`. Note length limits and whether multiple identifiers exist (user id vs group id).

### 4. User property mapping

Source user-property operations → AE user property methods. Use this table shape:

| Source operation | AE method | Notes |
|---|---|---|
| `setUserProperty(k, v)` | `user_set` | overwrite |

Cover `user_set` / `user_setOnce` / `user_add` / `user_append` / `user_unset` equivalents, and group-identify handling (AE has no direct group concept — mark `needs decision`).

### 5. Auto-track decision

Which source auto-collected events exist, and whether each maps to an AE auto-track event or is dropped. AE auto-track events must match `ae-generate-tracking-plan`'s autotrack list (`ta_app_install`, `ta_app_start`, `ta_page_show`, ...).

### 6. Dependency identifiers

Package/module names used to add or remove the source SDK:

- `add` mode: AE SDK dependency (resolved via the AE wiki, not here).
- `switch` mode: source SDK identifiers to remove (e.g. `firebase/analytics`, `@amplitude/analytics-browser`), split by platform.

### 7. Official docs

Authoritative links for the adapter author and for the user when manual confirmation is needed (never fetched at runtime; the agent reads this adapter, not the remote site).
