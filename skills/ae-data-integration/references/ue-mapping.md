# UE mapping contract

The mapping version is `ae-local-data-mapping/v1`.

Required structure:

```json
{
  "version": "ae-local-data-mapping/v1",
  "source": {
    "sha256": "<source-sha256>",
    "format": "csv",
    "data_set": "$"
  },
  "mode": "track",
  "confidence": "high",
  "account_id_field": "user_id",
  "time": {
    "field": "event_time",
    "format": "auto",
    "source_timezone": "Asia/Shanghai"
  },
  "event_name_field": "event_name",
  "properties": [
    { "source": "amount", "target": "amount", "type": "number" }
  ]
}
```

Use `distinct_id_field` when no account field exists. `mixed` requires `record_type_field`. Track requires `event_name_field` or a reviewed `default_event_name`. `source.format` is one of `csv`, `tsv`, `json`, `jsonl`, `xls`, `xlsx`. For a multi-file template mapping, `source.sha256` may be the wildcard `*`.

## Record types

Every record carries a `#type`. `mode: 'mixed'` resolves the type per row via `record_type_field`; otherwise the mode fixes it (`track` or `user_set`). The `record_type_field` values are normalized case- and underscore-insensitively, with `event`→`track` and `user`/`userset`→`user_set` aliases.

| `#type` | Meaning | Requires `#event_name` |
| --- | --- | :---: |
| `track` | Report an event into the event table | Yes |
| `user_set` | Overwrite user properties (create if missing) | No |
| `user_setOnce` | Initialize a property only when empty | No |
| `user_add` | Increment numeric user properties | No |
| `user_unset` | Clear user property values | No |
| `user_del` | Delete the user from the user table | No |
| `user_append` | Append elements to list properties | No |
| `user_uniq_append` | Append elements with deduplication | No |

## System fields

Top-level `#` fields map from named source columns. The user confirms each mapping; never infer it from a column name alone — a `user_id` column can be either an anonymous or a login ID, and only the user knows which.

| Field | Plain-language meaning | Required |
| --- | --- | :---: |
| `#distinct_id` | Anonymous visitor ID (device/cookie/visitor) — identifies unauthenticated traffic | At least one of `#distinct_id` / `#account_id` |
| `#account_id` | Login/account ID (database `user_id`, phone, member ID) — identifies authenticated users | At least one of `#distinct_id` / `#account_id` |
| `#time` | Event/profile occurrence time; AE bins data by it | Yes |
| `#event_name` | What the user did (`purchase`, `login`) | Only for `track` |
| `#ip` | Client IP; AE resolves geo from it | No |
| `#uuid` | Short-window deduplication ID | No |

`#zone_offset` is a preset property that tells AE the data's UTC offset (whole hours, -12..14) so `#time` is interpreted correctly. Unlike the fields above it lives **inside `properties`**, not at the top level. Provide it via `zone_offset_value` (a whole-hour integer such as `8` for UTC+8; an IANA name is also accepted and resolved to its offset at conversion time — sub-hour zones round to the nearest whole hour and DST zones reflect the offset then in effect, so historical data crossing a DST boundary should use `zone_offset_field`) or `zone_offset_field` (a source column carrying the offset per row); the two are mutually exclusive. Rows whose `zone_offset_field` value is missing or not an integer in -12..14 are quarantined.

Mapping keys: `account_id_field`, `distinct_id_field`, `time.field`, `event_name_field` (or a reviewed `default_event_name`), `ip_field`, `uuid_field`. Inspect surfaces every identity-shaped column in `identity_candidates` (name, `account`/`distinct` kind, unique and missing ratios) so the agent can present all candidates for confirmation. When the required identity column is absent, use an explicit `account_id_value`/`distinct_id_value` placeholder or `random_pool` — a user decision, never invented.

## Output record shape

System fields sit at the top level; every mapped property is nested under `properties`.

```json
{ "#type": "track", "#time": "2026-08-10 10:00:00.000", "#account_id": "u-1", "#event_name": "purchase", "properties": { "amount": 99.9, "channel": "app" } }
```

```json
{ "#type": "user_set", "#time": "2026-08-10 10:00:00.000", "#distinct_id": "d-1", "properties": { "user_level": 5, "user_tag": "vip" } }
```

`track` requires `#event_name`; user-profile types (`user_set`, `user_add`, …) do not.

## Optional overlay fields

All fields below are optional and are explicit user decisions — never invent them.

| Field | Shape | Effect |
| --- | --- | --- |
| `time_format` | `string` (strptime pattern) | Overrides auto-detection for `time.field`; used for ambiguous US/EU dates |
| `value_mapping` | `{ account_id? / distinct_id? / event_name? / record_type?: {original: replacement} }` | Exact-key replacement per system field (business-data keys map to AE-name values). A value with no matching key keeps its original text and fails validation, so confirm every distinct value is covered or excluded |
| `account_id_value` / `distinct_id_value` | `string` | Fixed placeholder identity (≤128 chars). Applies to every row when the corresponding `*_field` is absent; when the field exists, fills only the rows whose column is empty |
| `random_pool` | `{ account_ids?: string[], distinct_ids?: string[] }` | Synthesizes a random identity when the source field is absent |
| `exclude_columns` | `string[]` | Source columns skipped when building properties |
| `flatten_rules` | `{ outColumn: 'dot.path' }` | Nested flatten map. NDJSON/JSON paths are from the record root (`user_info.name`); CSV/TSV paths are `<column>.<cell-relative path>` into a JSON-encoded object cell (`user_profile.name`) — add the source column to `exclude_columns` when flattening it |
| `headers` | `string[]` | User-confirmed column names for a headerless file; presence means the first row is data. Never use inspect's `col_1..col_N` placeholders — infer names from each column's values, confirm them with the user, then write them here |
| `missing_time` | `'now'` | Fill a missing/empty `#time` with the current time, for user-profile rows only (explicit user decision; track rows are never filled) |
| `ip_field` | `string` | Source column emitted as the top-level `#ip` system field (client IP; AE resolves geo) |
| `uuid_field` | `string` | Source column emitted as the top-level `#uuid` system field (short-window deduplication ID) |
| `zone_offset_value` | `number` (integer -12..14) or IANA `string` | Emits the fixed `#zone_offset` preset property inside `properties`. An IANA name resolves to its integer UTC offset |
| `zone_offset_field` | `string` | Source column whose per-row integer value (-12..14) is emitted as `#zone_offset`; missing/non-integer rows are quarantined. Mutually exclusive with `zone_offset_value` |
| `event_meta` | `{ <event-name>: { desc?: string, tag?: string } }` | Per-event business description and `event_tag` for the tracking plan, keyed by AE event name. Inferred from the data and user context; the user supplies anything not inferable — never leave them empty |

Each `properties` entry may also carry `value_mapping` (per-property exact-key replacement), `transform` (one of `stringify`, `number`, `boolean`, `json`), `time_format` (only meaningful for `type: 'datetime'`), and `desc` (business description for the tracking plan; inferred, or user-provided when not inferable). Container columns (`object`/`list`) whose values arrive as JSON text — JSON-encoded CSV cells, or flattened NDJSON leaves — must set `transform: 'json'` so conversion parses the text back into a native object/array; it is a safe no-op when the value already arrived native.

## Time formats

Values with an explicit offset or `Z` are parsed by the JavaScript `Date` constructor (authoritative). Other values are matched against 21 formats; a `time_format` field overrides the match.

| Category | Example | Auto-detected |
| --- | --- | :---: |
| Standard AE | `2024-01-15 10:30:00.123` / `2024-01-15 10:30:00` | Yes |
| ISO 8601 | `2024-01-15T10:30:00` / with `.SSS` / with offset | Yes |
| Unix epoch | `1705314600` (seconds) / `1705314600000` (milliseconds) | Yes |
| Slash-separated | `2024/01/15 10:30:00` / `2024/01/15` | Yes |
| Dot-separated | `2024.01.15 10:30:00` / `2024.01.15` | Yes |
| Compact digits | `20240115103000` / `202401151030` / `20240115` | Yes |
| English month names | `15 Jan 2024 10:30:00` / `January 15 2024 10:30:00` / `Jan 15 2024 10:30:00` | Yes |
| Chinese date | `2024年1月15日` / `2024年1月15日 10:30:00` / `2024年1月15日 10时30分00秒` | Yes |
| US format | `01/15/2024 10:30:00` (MM/DD/YYYY) | No — use `time_format` |
| EU format | `15/01/2024 10:30:00` (DD/MM/YYYY) | No — use `time_format` |

## Data rules

- **Ingestion time window.** The receiver accepts event/profile times from 3 years before to 3 days after the server time; the CLI enforces this range. Client-side reporting has a tighter window (10 days before to 3 days after); historical data beyond the window needs AE support to extend it.
- **Property type locking.** A property's type is locked on first receipt, and properties sharing a name across events are one property — later reports must use the same type. Values whose type mismatches the locked type are dropped silently, so review an inferred type before committing it.
- **Quote stripping.** Paired single or double quotes around a cell value are stripped (`'user_001'` → `user_001`); a single-sided quote is kept as data (SQL exports often quote every value).
- **Column name sanitization.** Recommended mapping auto-names properties: accents are stripped, camelCase is split to snake_case, everything is lowercased, and illegal characters become `_`; a digit-leading name is prefixed `field_`, and a name with nothing recognizable falls back to `field_N`. Review these targets — especially the `field_N` fallbacks — and rename before converting.
- **Object sub-property keys.** Object and list-of-object keys follow the same naming rules as property names (lowercase snake_case, letter-leading, at most 50 chars, no `#`). A key that does not — for example a Chinese key inside a JSON cell such as `{"等级":"金牌"}` — quarantines the whole row, so confirm object keys before converting.

## Review checklist

- Source SHA-256 and data-set ID match the inspection result (or the mapping uses the `*` wildcard for multi-file).
- Identity values remain strings and are at most 128 characters.
- Source timezone is an IANA name derived from user/project context.
- `#zone_offset`, when set, is a whole-hour integer in -12..14 (or an IANA name/column that resolves to one) and is emitted inside `properties`, never at the top level.
- Event/property names are lowercase snake_case, begin with a letter, and are at most 50 characters.
- Target property names are unique and do not collide with UE system fields.
- Types are one of `string`, `number`, `boolean`, `datetime`, `list`, or `object`.
- Text is at most 2 KB; numbers stay within -9E15..9E15.
- Lists contain at most 500 strings (255 bytes each) or 500 objects.
- Objects contain at most 100 legal sub-properties; nested values follow the same type limits.
- A conversion rule does not hide a real type conflict.
- Event/profile times fall within the receiver window: previous 3 years through next 3 days.
- Do not fabricate UUIDs, identities, times, or events; `#ip`/`#uuid` map from named source columns only (`ip_field`/`uuid_field`).
- `value_mapping`, `random_pool`, and fixed `account_id_value`/`distinct_id_value` came from an explicit user decision and match the actual distinct values/columns.

`user_set` output for the same identity is ordered by time so receiver application order is deterministic. Conversion applies whole-row quarantine: any error on a row — identity, time, event, record type, or a single property (type coercion, size/limit) — drops the entire row. The row is written to `invalid.rows.jsonl` with its error codes, counted in `manifest.output.invalid_records`, and the manifest is blocked until reviewed. The failed rows are re-reportable without re-sending valid rows: fix the mapping, then run `convert --input-file <same-source> --mapping <fixed-mapping> --salvage-from <invalid.rows.jsonl>`. The salvage run re-processes only the listed row numbers against the same source, emits a `valid.ue.jsonl` containing only the newly fixed rows, and writes a new `invalid.rows.jsonl` with whatever still fails — so the loop repeats (feeding each round's `invalid.rows.jsonl` into the next `--salvage-from`) until no rows fail or the user stops.
