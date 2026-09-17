# AE Preset Properties & System Fields (authoritative)

> **Terminology**: 预置属性 = preset property | 系统字段 = system field | 自动采集 = auto-track

Source of truth: bundled AE wiki `wiki/te-docs/raw/preparations-before-data-ingestion/preset-properties-and-system-fields.md`
(official doc: `https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=preset_properties`).

> **Scope**: this skill switches the live SDK only; historical data import into AE is offline data-migration work, out of scope. This list is used here for two things: deciding drop-vs-keep on source preset/special properties, and preventing invalid or manual `#` writes.

## Hard rules

1. **Only the `#` names listed below ingest.** Any property whose name starts with `#` but is NOT in the preset-property table is an illegal field and is rejected at ingestion — it cannot be stored. Never invent a `#` name.
2. **Look up each source preset/special property here to decide drop-vs-keep.** If an AE preset equivalent exists (Sensors `$os` → `#os`, `$ip` → `#ip`, `$url` → `#url`), **drop the source property and rely on AE auto-collect** — never re-add it as a custom property. If there is **no** equivalent in the list (`$is_first_day`, `mp_country_code`, `$current_url`), do NOT fabricate a `#` name — map it to a normal custom property (snake_case per `mapping-framework.md` §1) or drop it, and **surface the choice to the user for confirmation**.
3. **Preset properties are SDK-provided.** Except `#ip`, do not set them manually — the AE SDK fills them automatically; manual setting is only done under AE staff guidance (multi-terminal consistency).
4. **System fields are not event/user properties.** `#distinct_id`, `#account_id`, `#user_id`, `#event_name`, `#time` (and the partition fields) are data-structure fields; they cannot be used as event names or property names. Identity migration goes through `login()` / the visitor-id API (`mapping-framework.md` §4), never through a property.

## Preset properties (48)

| # name | Description | Type |
|---|---|---|
| `#ip` | Client-side IP (basis for geo parsing) | String |
| `#country` | Country/region | String |
| `#country_code` | Country code (ISO 3166-1 alpha-2) | String |
| `#province` | Province | String |
| `#city` | City | String |
| `#os` | OS (Android, iOS, ...) | String |
| `#os_version` | OS version | String |
| `#manufacturer` | Device manufacturer | String |
| `#device_id` | Device ID (iOS IDFV/UUID; Android androidID) | String |
| `#device_model` | Device model | String |
| `#device_type` | Device type | String |
| `#screen_height` | Screen height | Number |
| `#screen_width` | Screen width | Number |
| `#app_version` | APP version | String |
| `#bundle_id` | APP package/process name | String |
| `#lib` | SDK type | String |
| `#lib_version` | SDK version | String |
| `#network_type` | Network type | String |
| `#carrier` | Operator | String |
| `#browser` | Browser | String |
| `#browser_version` | Browser version | String |
| `#duration` | Event duration (s) | Number |
| `#url` | Page URL (auto-track) | String |
| `#url_path` | Page path (`location.pathname`) | String |
| `#referrer` | Referrer URL | String |
| `#referrer_host` | Referrer host | String |
| `#title` | Page title | String |
| `#screen_name` | Screen name | String |
| `#element_id` | Element ID (auto-track) | String |
| `#element_type` | Element type | String |
| `#element_selector` | Element selector / viewPath | String |
| `#element_position` | Element position | String |
| `#element_content` | Element content | String |
| `#resume_from_background` | Resumed from background (bool) | Number |
| `#scene` | Scenario value (mini-program launch) | Number |
| `#mp_platform` | Mini-program platform | String |
| `#app_crashed_reason` | Crash stack info | String |
| `#zone_offset` | Timezone offset (hours vs UTC) | Number |
| `#system_language` | System language (ISO 639-1) | String |
| `#install_time` | APP install time | Date |
| `#simulator` | Is simulator (bool) | Number |
| `#ram` | Memory, e.g. `1.4/2.4` (GB) | String |
| `#disk` | Storage, e.g. `30/200` (GB) | String |
| `#fps` | Frames per second | Number |
| `#background_duration` | Background duration (s) | Number |
| `#start_reason` | Start reason (non-launcher mode) | String |
| `#ua` | User-Agent info | String |
| `#utm` | Ad-source info | String |

## System fields

Not usable as event/property names; listed for reference when reasoning about identity and partition fields.

**Event table**: `$part_event` (partition, from `#event_name`), `$part_date` (partition, from `#event_time`), `#user_id`, `#account_id`, `#distinct_id`, `#event_name`, `#event_time` (= `#time` in the data), `#server_time`.

**User table**: `#user_id`, `#account_id`, `#distinct_id`, `#active_time`, `#reg_time`, `#update_time`, `#server_time`.
