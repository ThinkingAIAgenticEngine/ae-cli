# analysis sql-table columns

List queryable columns for one server-authorized SQL table.

For an unknown table, first call `analysis sql-table list --project-id <project_id>`, then copy the returned `sql_reference` (or legacy `table_ref`). Reuse an already verified authorized table reference in the same scope. Do not guess table or column names.

```bash
ae-cli analysis sql-table columns \
  --project-id <project_id> \
  --table-ref <table_ref> \
  [--usage analysis|tag_cluster|sql_datatable]
```

The result includes `table_ref`, quoted `sql_reference`, `table_type`, nullable `source_type` and `repo_table_type`, and the resolved catalog/schema/table, and returns its columns with machine names, types, and available descriptions. A unique table-only reference is accepted; ambiguous references fail with authorized `candidate_tables` with quoted `sql_reference` values instead of selecting one arbitrarily. Quote the entire shell argument, for example `--table-ref '"hive"."space.name"."orders"'`. Double quotes inside an identifier are doubled. One to three identifier segments are supported; a two-segment reference uses the `hive` catalog.

Pass the same `usage` used for `sql-table list`. For SQL tags and SQL clusters this must be `--usage tag_cluster`; use `--usage sql_datatable` for SQL-built data tables; the default is `analysis`. Do not fall back to another usage if the server rejects it.

When copying returned columns into Trino SQL, delimit identifiers containing `#`, `$`, `@`, spaces, or punctuation with double quotes, for example `"#user_id"` or `"$part_event"`. Single quotes are string literals. The CLI does not auto-rewrite SQL.

If the selected table is an event table, the SQL must include a date-partition predicate on the discovered `"$part_date"` column, for example `WHERE "$part_date" BETWEEN '2026-07-01' AND '2026-07-07'`. The backend rejects event-table SQL without this condition. Do not apply this rule to a table whose discovered columns do not include `$part_date`.
