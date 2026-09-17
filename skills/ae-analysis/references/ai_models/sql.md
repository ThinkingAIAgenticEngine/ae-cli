# `sql` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for SQL analysis. The AI-facing model has only:

- `sql`: required SQL text.
- `params`: optional dynamic parameter values and definitions, required only when SQL contains `${...}` placeholders.

Simple SQL:

```json
{"sql":"SELECT 1 AS value"}
```

Trino special identifiers must use double-quoted identifier delimiters:

```json
{"sql":"SELECT \"#user_id\", \"$part_event\" FROM hive.ta.v_event_1 WHERE \"$part_date\" BETWEEN '2026-07-01' AND '2026-07-07' LIMIT 20"}
```

Reserved words used as identifiers must also be double quoted, for example `SELECT "end" FROM ...`.

For multiline SQL JSON, ensure JSON decoding produces a real line break in the `sql` value. Do not submit a literal `\\n` sequence outside a quoted SQL string value; use a JSON escape that the caller decodes once before invoking the capability.

Event-table queries must include a date-partition predicate on the quoted `"$part_date"` column. The backend rejects SQL against an event table when this predicate is absent. This requirement is specific to event tables; do not invent a `$part_date` condition for a table whose discovered columns do not include it.

Typed condition-fragment placeholder:

```json
{
  "sql": "select * from events where country ${Text:country}",
  "params": [
    {"name": "country", "type": "text", "operator": "eq", "value": "US"}
  ]
}
```

Raw variable placeholder:

```json
{
  "sql": "select * from events where country = ${country}",
  "params": [
    {"name": "country", "type": "variable", "value": "'US'"}
  ]
}
```

Time placeholder:

```json
{
  "sql": "select * from events where ${PartDate:ds}",
  "params": [
    {"name": "ds", "type": "part_date", "recent_day": "1-7", "use_timezone": true}
  ]
}
```

Rules:

- If SQL has no `${...}` placeholder, omit `params`.
- If SQL has placeholders, every placeholder must have one matching item in `params`.
- Raw variables use `${name}`, not `${Variable:name}`. When creating or updating a selector definition, its saved default `value` must equal one of its `options[].value` SQL fragments. This definition-time rule is different from executing a saved report: `analysis report-data run|export --sql-params` must put the exact `options[].name` UI label in the runtime override's `value`, never the SQL fragment from `options[].value`. `${PartDate:name}` expands to a complete predicate, so place it directly after `WHERE`/`AND` rather than after a column name.
- A `part_date` parameter must provide either `recent_day` or a complete custom range with both `start_time` and `end_time`; one-sided custom ranges are invalid.
- `use_timezone` is an optional boolean definition field that is only valid for `part_date`. It defaults to `false`. When `true`, that PartDate parameter uses the query's effective timezone selected by `zone_offset` or the current user/project default; when `false`, it follows the non-timezone-aware PartDate path. This is distinct from the command-level `zone_offset`.
- Do not pass SQL-IDE internals such as `sqlVoParams`, `sqlViewParams`, `paramType`, `paramName`, `paramExpress`, `commonFilter`, or `requiredEvents`.
- Delimit any Trino identifier containing `#`, `$`, `@`, spaces, punctuation, or a reserved word with double quotes, for example `"#user_id"`, `"$part_event"`, and `"end"`. Single quotes create string literals, not identifiers. Escape a literal double quote inside an identifier by doubling it. The CLI preserves the submitted SQL and does not rewrite identifiers.
- For an event table, include a date-partition predicate on the discovered `"$part_date"` column, for example `WHERE "$part_date" BETWEEN '2026-07-01' AND '2026-07-07'`. The backend rejects event-table SQL without this condition.
- Do not invent table or column names. For an unknown table, call `analysis sql-table list --project-id <project_id>` and select an exact authorized `table_ref`. Inspect columns with `analysis sql-table columns --project-id <project_id> --table-ref <table_ref>` before writing SQL; reuse already verified columns in the same scope. Keep `usage=analysis` for both calls. Ask only when authorized candidates remain ambiguous or the required source is unavailable.
- For a saved dynamic SQL report, put the default values in `analysis report create/update --definition`. When data is requested, query once using the requested value-only `--sql-params` overrides, or omit that flag to use saved defaults.
- `use_timezone` belongs to the saved parameter definition. To change it, update the report `definition`; never pass it through report-data `--sql-params`, which changes values only.
- SQL tags and SQL clusters do not use this general parameter contract. They accept only `${PartDate:name}` with `type=part_date`, and their tables must be discovered with `analysis sql-table list/columns --usage tag_cluster`; see [user tag models](../user_tag_models.md) and [user cluster models](../user_cluster_models.md).
