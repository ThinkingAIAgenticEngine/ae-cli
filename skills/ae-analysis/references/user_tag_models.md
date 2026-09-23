# User tag definition models

This is the canonical `--definition-request` contract for direct user-tag create/update. Shared operators, properties, time ranges, and filters are defined in [`audience_models.md`](audience_models.md).

Top-level `type` is exactly one of `condition`, `metric`, `first_last`, or `sql`.

## Condition tag

`condition_values` is a non-empty array. Each item requires `value`; optional fields are `remark`, `events`, `event_relation`, `filters`, `relation`, `event_user_relation`, and `behavior_sequences`.

```json
{
  "type":"condition",
  "condition_values":[{
    "value":"payer",
    "remark":"Paid in the last 30 days",
    "events":[{"event":"pay","operator":"gte","value":1,"aggregation":"count","time_range":{"mode":"recent","unit":"day","value":30}}],
    "event_relation":"and",
    "filters":{"relation":"and","items":[{"field":"country","operator":"eq","values":["US"]}]},
    "event_user_relation":"and"
  }]
}
```

## Metric tag

Required: `event`, `aggregation`, and `time_range`. `property`, `percentile`, and `filters` are optional. Filters support only event properties and user properties. A string `field` is an event property; use `{name,type:"user_property"}` for a user property. Use the semantic time mappings in [`audience_models.md`](audience_models.md); never omit `time_range` from a metric tag.

Supported aggregations are `count`, `active_days`, `sum`, `avg`, `max`, `min`, `median`, and `percentile`. `median` is a dedicated aggregation for a numeric event `property`; do not represent it as `percentile=50`.

Use `aggregation=percentile` with a numeric event `property` and pass `percentile`. Supported percentile values match the page controls: `5`, `10`, `20`, `25`, `30`, `40`, `60`, `70`, `75`, `80`, `90`, `95`, and `99`. The `percentile` field is required for percentile aggregation and is rejected for every other aggregation.

```json
{"type":"metric","metric":{"event":"pay","aggregation":"sum","property":"amount","time_range":{"mode":"previous","unit":"day","value":30},"filters":{"relation":"and","items":[{"field":"channel","operator":"eq","values":["app"]},{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}}}
```

Median example:

```json
{"type":"metric","metric":{"event":"pay","aggregation":"median","property":"amount","time_range":{"mode":"previous","unit":"day","value":30}}}
```

Percentile example:

```json
{"type":"metric","metric":{"event":"pay","aggregation":"percentile","property":"amount","percentile":90,"time_range":{"mode":"previous","unit":"day","value":30}}}
```

## First/last tag

Required: `event`, `occurrence=first|last`, and exactly one value source: `calculation` or `property`. `time_range` and `filters` are optional. Filters support only event properties and user properties. A string `field` is an event property; use `{name,type:"user_property"}` for a user property. Supplying neither or both value sources is rejected before execution. Use the semantic time mappings in [`audience_models.md`](audience_models.md) for dynamic ranges such as today, this month, or a fixed start date through today.

```json
{"type":"first_last","first_last":{"event":"login","occurrence":"last","property":"platform","time_range":{"mode":"recent","unit":"month","value":1},"filters":{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}}}
```

From a fixed date through today:

```json
{"type":"first_last","first_last":{"event":"login","occurrence":"first","calculation":"specific_time","time_range":{"mode":"start_to_today","start_time":"2026-07-01"}}}
```

## SQL tag

```json
{"type":"sql","sql":"SELECT \"#user_id\", 'payer' AS tag_value FROM hive.ta.v_event_1 WHERE ${PartDate:partdate} AND \"$part_event\"='pay'","params":[{"name":"partdate","type":"part_date","recent_day":"1-7"}]}
```

SQL tags support only `${PartDate:name}` dynamic placeholders. Every placeholder requires one `params` item with `type=part_date` and either `recent_day` or `start_time` plus `end_time`. `Text`, `Number`, `Variable`, `Time`, and `Selector` parameters are valid for general SQL analysis but are not valid for SQL tags.
For `recent_day`, `0-7` means 最近7天 and includes today; `1-7` means 过去7天 and excludes today.

`${base_date}` is a separate built-in computation-date macro, not a user-configurable dynamic placeholder. SQL tags may use `${base_date}`, a formatted value such as `${base_date:yyyy-MM-dd}`, or a server-supported offset such as `${base_date:yyyy-MM-dd-1*day}`. Keep the macro in `sql` and do not add it to `params`; it is expanded when the tag is calculated. Expansion produces plain text, so quote the macro when the SQL expression expects a string or date literal:

```json
{"type":"sql","sql":"SELECT \"#user_id\", 'payer' AS tag_value FROM hive.ta.v_event_1 WHERE \"$part_date\"='${base_date:yyyy-MM-dd}' AND \"$part_event\"='pay'"}
```

Before writing a SQL tag, use `analysis sql-table list --project-id <project_id> --usage tag_cluster`, then call `analysis sql-table columns --project-id <project_id> --table-ref <table_ref> --usage tag_cluster`. The `tag_cluster` authorized table set is intentionally different from the general analysis SQL table set; do not reuse a table discovered with the default `usage=analysis`.

`#user_id`, `$part_event`, and any other Trino identifier containing `#`, `$`, `@`, spaces, or punctuation must be delimited with double quotes. Single quotes are only for values.

When the SQL reads an event table, it must also filter the quoted `"$part_date"` date-partition column; the backend rejects event-table SQL without that predicate.

For space tables, use the returned `sql_reference` when writing SQL and loading columns. `source_type=gaia` identifies a space table; keep `--usage tag_cluster` for both discovery commands.
