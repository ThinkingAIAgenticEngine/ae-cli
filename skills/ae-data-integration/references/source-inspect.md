# Source — business identification

## Establish intent and file

Confirm:

1. The exact file path or paths.
2. The desired outcome: AE ingestion, local analysis, or help deciding.
3. For ingestion, the target environment/project if already known.

Accept one or more CSV, TSV, TXT, JSON, JSONL (NDJSON), XLS, or XLSX files. CSV/TSV/TXT/JSON/JSONL/XLSX have no hard size limit; files over 1 GB print a stderr warning with an estimated processing time and suggest splitting. XLS over 100 MB prints a memory-risk warning (the legacy parser loads the whole workbook, roughly 5-10x file size); XLS over 1 GB is still rejected — convert it to XLSX or split it first.

## Inspect without exposing raw values

Before the full inspection (which streams and profiles the entire file and can take
minutes on large files), pre-check the size and time estimate:

```bash
ae-cli data-integration inspect --input-file '<path>' --dry-run
```

For each file that reports a `warning`, `memory_risk: true`, or `rejected: true`,
surface the `estimated_duration` / `reason` / `warning` to the user verbatim and
confirm before running the real `inspect`. Never start a multi-minute or memory-risk
job without the user seeing the estimate and risk first. A rejected file cannot
proceed; follow its `reason` instead of asking for confirmation.

Run:

```bash
ae-cli data-integration inspect --input-file '<path>'
```

Repeat `--input-file` to inspect several files at once; the output then adds cross-file type conflicts and a per-file column union.

If `selection_required=true`, show only the Sheet/JSON Path candidates and ask the user to choose. Then rerun:

```bash
ae-cli data-integration inspect --input-file '<path>' --data-set '<candidate-id>' --source-timezone '<iana-timezone>'
```

Report row/column counts, field types, missing/unique/time-parse ratios, UE eligibility, mapping confidence, and warnings. Samples are bounded (up to 5 distinct, truncated) — summarize, never paste them. ID-like columns (`id`, `*_id`, `*_key`, `*_code`, `*_no`, `*_num`) stay `string` even when every value is numeric; JSON-encoded object/array values inside CSV cells are recognized as `object`/`list`, not `string`. IP- and UUID-named columns are additionally checked against their value specs: inspect warns how many non-empty values are invalid IPv4/IPv6, private/LAN IPs, or non-UUID strings, so the user can decide whether to map them as `ip_field`/`uuid_field`. Read [UE routing](ue-routing.md) before choosing a branch.

A stderr `Warning: … column count different from the header row …` means the CSV/TSV has ragged rows (extra fields dropped, missing fields treated as empty); report it as a data-quality signal. For how every pipeline failure — abnormal data, parse errors, and program errors — is classified and handled, see [error handling](error-handling.md).

## Advanced input

- **Headerless files** — inspect auto-detects a missing header row on CSV/TSV and reports `no_headers: true` with a `header_detection` verdict and `auto_headers` placeholders (`col_1..col_N`); the first row is already treated as data. `--headerless` forces the same behavior without detection. Never keep the `col_1..col_N` placeholders — they carry no business meaning. For each column, read its bounded samples and inferred type and propose a meaningful name, present every proposal to the user (column position, sample summary, suggested name), and let the user confirm or rename each one; record the confirmed names in the mapping's `headers` field. When the user already knows the names, re-run inspect with `--headers 'col1,col2,...'` so the recommended mapping carries them.
- **TSV / TXT** — `.tsv` and `.tab` use a tab delimiter with no quoting convention; `.txt` and unknown extensions are content-sniffed into CSV, TSV, or NDJSON.
- **Encoding** — text files are auto-detected (UTF-8, GBK, GB2312, Big5, and others); no flag is needed.
- **Excel sheets** — `--merge-sheets` streams every worksheet in file order instead of a single selected sheet; otherwise ask which sheet/`--data-set` to use. Inspect also reports `header_consistency` (`all_same` or `different`) across a workbook's sheets, with `header_details` listing each sheet's header row when they differ; prefer `--merge-sheets` only when headers match.
- **Multi-file type conflicts** — when the same column has different inferred types across files, present each conflict and resolve with `--type-resolutions` on `convert` (see [transform](transform.md)).

## Nested flattening (NDJSON/JSON records and JSON-encoded CSV/TSV/Excel cells)

Nested data is analyzed per field, and the recommended mapping encodes one decision per container: keep whole, flatten one level, or flatten to the leaves. This flow is agent-driven and non-interactive: never pipe pre-filled answers into any prompt, and never silently pick a depth for a node.

1. **Locate the nested structure.**
   - NDJSON/JSON: read the top-level `nested_tree` from the inspect result (record-root paths).
   - CSV/TSV/Excel: a JSON-encoded column carries its own tree at `columns[].nested_tree` (paths relative to that cell). Object cells list child keys; array cells (`items`-style) expose an `elementKind` and, for object arrays, the union of the element fields.
   Object nodes list child keys, array nodes carry an `elementKind`, primitive leaves carry an inferred type and bounded samples. Summarize node kinds, never paste samples.
2. **Review the recommended mapping's per-field decision, then confirm adjustments.**
   The recommended mapping already encodes, per container, a data-driven depth decision — the depth is not uniform across fields:
   - **Keep whole** — a single-level object (every child scalar or a scalar array) is declared `type: 'object'` with `transform: 'json'`, plus one `parent.child` sub-property per child; a single-level object array is declared `type: 'array_row'` with one `parent.child` sub-property per element field. The parent entry carries the native value and conversion emits it once; each child is a plan-only declaration (scalar or `list`) that never reads a column of its own.
   - **Flatten one level / to the leaves** — an object that itself contains an object or object array cannot be kept whole; it collapses one level and each child is decided independently: scalar children become flat properties materialized through `flatten_rules`, and nested objects/arrays recurse until a single-level container is reached (which is then kept whole).
   - **Scalar array** — `["a","b"]` stays `list` (→ AE `array_string`), a leaf with no children.
   - **Nested element field** — an element field that is itself an object/array stays inside the array data and is not declared as a sub-property (array-element flattening is not supported); the mapping warns so it is never silently dropped.
   Present the resulting property list as a table and default to it; ask the user to confirm or adjust only where you disagree with a node's inferred decision (business-entity names with stable scalar children vs generic containers like `payload`/`data`/`config` vs nesting deeper than one level with no clear intent).
3. **Record overrides in `flatten_rules` (`{ "out_column": "dot.path" }`) and `exclude_columns`.**
   The recommended mapping already carries the flatten rules for its collapsed levels. When you override it:
   - NDJSON/JSON: the path is from the record root (`user_info.name`).
   - CSV/TSV/Excel: the path is `<column>.<cell-relative path>` (`user_profile.name`), and add the source column to `exclude_columns` so the whole object is not also mapped.
   - **`flatten_rules` only materializes the out column in the row — it does not emit it.** For every out column, also add a `properties` entry with `source` set to that out-column name (plus `target`/`type`/`desc`); otherwise the flattened value is silently dropped from the output record.
   A leaf path becomes a snake_case out column when not explicitly named (`user_info.address.geo.lat` → `user_info_address_geo_lat`; cell-relative rules prefix the column: `user_profile.level` → `user_profile_level`). A string that looks like a number (phone, zip, ID) is kept as a string unless the user says otherwise. Containers kept whole are declared `type: 'object'`/`'array_row'`/`'list'` **with `transform: 'json'`** so conversion restores the native structure; a kept whole `object`/`array_row` also declares its scalar children as dotted `parent.child` sub-properties in `properties`.
