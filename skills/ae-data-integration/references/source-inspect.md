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

Report row/column counts, field types, missing/unique/time-parse ratios, UE eligibility, mapping confidence, and warnings. Samples are bounded (up to 5 distinct, truncated) — summarize, never paste them. ID-like columns (`id`, `*_id`, `*_key`, `*_code`, `*_no`, `*_num`) stay `string` even when every value is numeric; JSON-encoded object/array values inside CSV cells are recognized as `object`/`list`, not `string`. Read [UE routing](ue-routing.md) before choosing a branch.

## Advanced input

- **Headerless files** — inspect auto-detects a missing header row on CSV/TSV and reports `no_headers: true` with a `header_detection` verdict and `auto_headers` placeholders (`col_1..col_N`); the first row is already treated as data. `--headerless` forces the same behavior without detection. Never keep the `col_1..col_N` placeholders — they carry no business meaning. For each column, read its bounded samples and inferred type and propose a meaningful name, present every proposal to the user (column position, sample summary, suggested name), and let the user confirm or rename each one; record the confirmed names in the mapping's `headers` field. When the user already knows the names, re-run inspect with `--headers 'col1,col2,...'` so the recommended mapping carries them.
- **TSV / TXT** — `.tsv` and `.tab` use a tab delimiter with no quoting convention; `.txt` and unknown extensions are content-sniffed into CSV, TSV, or NDJSON.
- **Encoding** — text files are auto-detected (UTF-8, GBK, GB2312, Big5, and others); no flag is needed.
- **Excel sheets** — `--merge-sheets` streams every worksheet in file order instead of a single selected sheet; otherwise ask which sheet/`--data-set` to use. Inspect also reports `header_consistency` (`all_same` or `different`) across a workbook's sheets, with `header_details` listing each sheet's header row when they differ; prefer `--merge-sheets` only when headers match.
- **Multi-file type conflicts** — when the same column has different inferred types across files, present each conflict and resolve with `--type-resolutions` on `convert` (see [transform](transform.md)).

## Nested flattening (NDJSON/JSON records and JSON-encoded CSV/TSV cells)

Nested data is flattened one level per user decision. This flow is agent-driven and non-interactive: never pipe pre-filled answers into any prompt, and never silently pick `Flatten` for a node.

1. **Locate the nested structure.**
   - NDJSON/JSON: read the top-level `nested_tree` from the inspect result (record-root paths).
   - CSV/TSV: a JSON-encoded object column carries its own tree at `columns[].nested_tree` (paths relative to that cell). Array cells (`items`-style) are `list` columns and carry no tree.
   Object nodes list child keys, array nodes carry an `elementKind`, primitive leaves carry an inferred type and bounded samples. Summarize node kinds, never paste samples.
2. **Judge first, then confirm.** Read the node names and inferred types and propose, per container, whether to flatten (and to what depth), keep as JSON, or keep as a list. Present the proposal as a table and default to it; ask the user to confirm or adjust. Only ask node-by-node for the nodes you cannot judge from the names.
   - Business-entity names with stable scalar children (`user_info`, `address`, `order`) → propose flattening to the leaves.
   - Generic container names (`payload`, `data`, `config`, `meta`, `extra`, `attributes`) → propose keeping as JSON, unless the user wants a specific sub-field.
   - Arrays are always kept as a list property and never split.
   - Nesting deeper than one level with no clear intent → propose keeping as JSON or flattening only the first level.
3. **Record the answers in `flatten_rules` (`{ "out_column": "dot.path" }`).**
   - NDJSON/JSON: the path is from the record root (`user_info.name`).
   - CSV/TSV: the path is `<column>.<cell-relative path>` (`user_profile.name`), and add the source column to `exclude_columns` so the whole object is not also mapped.
   A leaf path becomes a snake_case out column when not explicitly named (`user_info.address.geo.lat` → `user_info_address_geo_lat`; CSV prefixes the column: `user_profile.level` → `user_profile_level`). A string that looks like a number (phone, zip, ID) is kept as a string unless the user says otherwise. Containers kept whole are declared `type: 'object'`/`'list'` **with `transform: 'json'`** so conversion restores the native structure.
