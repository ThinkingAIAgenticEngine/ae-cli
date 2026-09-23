# analysis sql-table list

List the server-authoritative SQL table references that the current user may query in one project.

## Command

```bash
ae-cli analysis sql-table list \
  --project-id <project_id> \
  [--queries '["user","event"]'] \
  [--limit <1-200>] \
  [--offset <next_offset>] \
  [--usage analysis|tag_cluster|sql_datatable]
```

## Contract

- Use this command before writing SQL when the table is not already known. Do not ask the customer to supply the fixed project event/user table name and do not guess `v_event_<id>` or `v_user_<id>`.
- Use `sql_reference` (quoted catalog/schema/table with escaped double quotes) when copying a table into SQL or `analysis sql-table columns --table-ref`. The legacy `table_ref` remains accepted; do not split it on dots because identifier segments can contain dots.
- `queries` accepts 1 to 20 non-empty strings with OR semantics. Matching rows include `matched_queries` and `matched_fields`; singular `query` is not accepted.
- Each item also returns `catalog`, `schema`, `table`, `table_type`, `description`, `usage`, `source_type`, `repo_table_type`, and `sql_reference`. `source_type=gaia` identifies space tables; source/type metadata may be null for ordinary tables. Do not infer a space table from `table_type=customTable`.
- `usage=analysis` is the default table set for SQL analysis and reports. Use `usage=tag_cluster` for SQL tags or SQL clusters, and `usage=sql_datatable` for SQL-built data tables. Lists are flat; these usages select authorized sets rather than UI categories. Do not silently retry a rejected usage with `analysis`. These server-authorized sets differ, and the same usage must be passed to `sql-table columns`.
- When `has_more=true`, continue only with the returned `next_offset`. Stop when `has_more=false`.
- An empty list means the current identity has no queryable SQL tables in that project; do not fabricate a table name.

## Example workflow

```bash
ae-cli analysis sql-table list --project-id 1 --queries '["user","account"]'
ae-cli analysis sql-table columns --project-id 1 --table-ref hive.ta.v_user_1
ae-cli analysis adhoc run --project-id 1 --model-type sql --definition '{"sql":"select * from hive.ta.v_user_1 limit 10"}'
```

Use the exact `sql_reference` returned by the first command when writing SQL; the example reference is illustrative only.
