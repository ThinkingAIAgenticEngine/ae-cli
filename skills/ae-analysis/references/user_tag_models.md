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

Required: `event`, `aggregation`. `property` and `time_range` are optional.

```json
{"type":"metric","metric":{"event":"pay","aggregation":"sum","property":"amount","time_range":{"mode":"previous","unit":"day","value":30}}}
```

## First/last tag

Required: `event`, `occurrence=first|last`, and exactly one value source: `calculation` or `property`. `time_range` and `filters` are optional. Supplying neither or both value sources is rejected before execution.

```json
{"type":"first_last","first_last":{"event":"login","occurrence":"last","property":"platform","time_range":{"mode":"recent","unit":"day","value":30}}}
```

## SQL tag

```json
{"type":"sql","sql":"SELECT \"#user_id\", 'payer' AS tag_value FROM hive.ta.v_event_1 WHERE ${PartDate:partdate} AND \"$part_event\"='pay'","params":[{"name":"partdate","type":"part_date","recent_day":"1-7"}]}
```

SQL tags support only `${PartDate:name}` dynamic placeholders. Every placeholder requires one `params` item with `type=part_date` and either `recent_day` or `start_time` plus `end_time`. `Text`, `Number`, `Variable`, `Time`, and `Selector` parameters are valid for general SQL analysis but are not valid for SQL tags.
For `recent_day`, `0-7` means 最近7天 and includes today; `1-7` means 过去7天 and excludes today.

Before writing a SQL tag, use `analysis sql-table list --project-id <project_id> --usage tag_cluster`, then call `analysis sql-table columns --project-id <project_id> --table-ref <table_ref> --usage tag_cluster`. The `tag_cluster` authorized table set is intentionally different from the general analysis SQL table set; do not reuse a table discovered with the default `usage=analysis`.

`#user_id`, `$part_event`, and any other Trino identifier containing `#`, `$`, `@`, spaces, or punctuation must be delimited with double quotes. Single quotes are only for values.

When the SQL reads an event table, it must also filter the quoted `"$part_date"` date-partition column; the backend rejects event-table SQL without that predicate.
