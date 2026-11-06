# ThinkingData AE (formerly TE) Capability Quick Reference

Source: historical local reference derived from official docs at docs-v2.thinkingdata.cn (6.0 / then-current). No live freshness or runtime capability verification is implied by this repair.

For an operational interface, load the current official domain skill and prefer curated CLI documentation. If the installed contract is unknown, use targeted `--help` or capability discovery followed by `inspect` before composing input. Never guess capability IDs, fields, auth or risk from this knowledge summary. Use validate OR dry-run as needed, not a redundant stack; stop repeated failing probes and report the prerequisite. Remote operations require user authorization; upload is owned by [Validated Upload](workflows/validated-upload.md).

## 1. Preset Properties (start with `#`, auto-collected by the SDK, no self-reporting needed client-side)

| Preset property | Meaning | Corresponding common custom field |
|---|---|---|
| `#ip` | Client IP; the server derives geolocation from it | ip |
| `#country` / `#country_code` | Country / country code (derived from IP) | country |
| `#province` / `#city` | Province / city (derived from IP) | — |
| `#os` | Operating system (Android/iOS) | os_type |
| `#os_version` | Operating system version | os_version |
| `#manufacturer` | Manufacturer (Apple/vivo...) | brand |
| `#device_model` | Device model | device_model |
| `#device_type` | Device type (iPad/iPhone...) | — |
| `#device_id` | Device ID (iOS: IDFV/UUID, Android: androidID) | device_id |
| `#screen_height` / `#screen_width` | Screen height / width | — |
| `#app_version` | App version | app_version |
| `#bundle_id` | App package name | app_package_name |
| `#lib` / `#lib_version` | SDK type / version (**not** the app version code) | — |
| `#network_type` | Network type (WIFI/4G...) | — |
| `#carrier` | Carrier | — |
| `#system_language` | System default language | language |
| `#zone_offset` | **Device** time-zone offset (not the game server time zone) | — |
| `#install_time` | App install time | — |
| `#duration` | Event duration recorded by the timer feature (seconds) | — |
| `#utm` | Campaign source (**partially** covers attribution fields; the attribution four-piece generally still requires attribution-platform postback or self-reporting) | channel/campaign/ad_group/material |
| `#start_reason` / `#resume_from_background` / `#background_duration` | Start reason / whether woken from background / background dwell time (ta_app_start) | — |
| `#app_crashed_reason` | Crash stack (ta_app_crash) | — |
| `#simulator` `#ram` `#disk` `#fps` `#ua` | Simulator / RAM / disk / FPS / UA | — |

Auto-tracking exclusive (ta_app_view / ta_app_click): `#title` `#screen_name` `#url` `#referrer` `#element_id` `#element_type` `#element_selector` `#element_position` `#element_content` `#scene` (mini program) `#mp_platform`.

## 2. System Fields (cannot be reported as custom events / user properties)

Event table: `#app_id`, `#user_id`, `#account_id` (login ID, set via the SDK login API), `#distinct_id` (visitor ID), `#event_name`, `#event_time` (=`#time`), `#server_time`, `#uuid` (data unique ID), `$part_event` (event partition, taken from the event name), `$part_date` (date partition, taken from `#event_time`), `#kafka_offset`, `#dw_create_time`/`#dw_update_time`.

The user table additionally has: `#active_time` (activation time), `#reg_time` (registration time), etc.

Common mapping conclusions: game_uuid -> `#uuid`; app_id -> `#app_id`; user_id -> `#account_id`; event_id/event_name -> `#event_name`; start_time -> `#time`; app_name needs no reporting (project config).

## 3. Auto-Tracked Events (Android/iOS SDK)

| Event name | Trigger | Exclusive preset properties |
|---|---|---|
| `ta_app_install` | First launch after install (not triggered by upgrade, re-triggered by reinstall) | — |
| `ta_app_start` | Open app / wake from background | `#resume_from_background`, `#start_reason`, `#background_duration` |
| `ta_app_end` | Close app / switch to background | `#duration` (duration of this visit, seconds) |
| `ta_app_crash` | Uncaught exception | `#app_crashed_reason` |
| `ta_app_view` | Browse page (Activity) | `#title` `#screen_name` `#url` `#referrer` |
| `ta_app_click` | Click a control | `#element_*`, `#title`, `#screen_name` |

- Enable: `TDAnalytics.enableAutoTrack(type combination)`
- `ta_app_view`/`ta_app_click` are **full auto-tracking**: they require integrating the auto-tracking plugin (`android-gradle-plugin2`), produce lots of low-value data and consume the event-volume quota — **not recommended by default**; cover key interactions with custom fine-grained events instead
- Background silent launches (push / service) do not trigger the start event by default

## 4. User Properties (`#type` operation type)

| Operation | Semantics | Use case |
|---|---|---|
| `user_set` | Overwrite with the latest value | Current state (current level, current resources, last login time) |
| `user_setOnce` | Write only the first time, ignore if a value exists | Lifetime-unchanging info (registration channel, first login / ad time) |
| `user_add` | Numeric accumulation | Counters (cumulative payment amount / count, cumulative ad count) |
| `user_unset` | Clear the property value | — |
| `user_append` / `user_uniq_append` | List append / append with full-list deduplication | Tag collections |
| `user_del` | Delete the user | — |

The table above describes SDK/data operations, not the plan-import update enum. Plan declarations are limited to `user_set`, `user_setOnce`, `user_add`, `user_append` unless a current official contract proves otherwise; do not export `user_unset`/`user_del`/`user_uniq_append` as plan declarations.

**Red line for division of duties**: user properties are "user states with node significance" that keep only the latest value and are used for audience selection and segmentation; **not suitable for high-frequency changes** — high-frequency data (values within a single round, per-action context) must go in event properties. User property operations take effect in the order the backend **receives the data**, not by `#time`.

## 5. Data Format and Naming Rules

- Custom event / property names: start with a letter, only lowercase letters, digits, and underscore `_`, <=50 characters, no spaces; custom properties must **not start with `#`** (a leading `#` makes it an illegal field that cannot be written to the warehouse)
- Data types: numeric (-9E15~9E15) / text (default upper limit 2KB) / time / boolean / list / object / object group; when the reported type conflicts with the preset property, **the value is discarded (null)**
- `#time` is mandatory, precise to seconds or milliseconds; report at least one of `#account_id` and `#distinct_id`
- `#uuid` deduplication only validates data from **the last few hours** (to handle network-jitter resends), not full deduplication

## 6. Partitioning and Query Performance

- `$part_event` = `#event_name`: **the event name is the partition key**. After splitting a high-frequency filter dimension (e.g., resource production vs consumption) into separate events, a query scans only the relevant partition, significantly improving performance; after splitting, remember to delete the redundant type-distinguishing field
- `$part_date` = event date partition

## 7. Correlation Key Design Pattern (Instance ID)

In-round / in-session behavior chains (start -> intermediate behavior -> settlement) must have a client-generated instance ID:

- Generate a UUID at the start of each "new instance"; keep it unchanged across continuations (e.g., continuing after revival); regenerate on a fresh restart
- All events in the chain must carry it; name it intuitively (English name for granularity + display name for purpose, e.g., `stage_attempt_id` / in-round behavior correlation ID)
- Without it, when the same level is restarted repeatedly, start/settlement cannot be paired correctly, and quit analysis, first-consumption timing, and funnels are all distorted
