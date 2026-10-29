# metadata data-table get

> Capability id: `metadata.data_table.get` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id>
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id> --include-preview true
```

Use this command to inspect a metadata data table's columns, bindings, and saved SQL configuration. It requires the existing metadata view permission for the selected project. Reading a saved SQL definition does not authorize querying its upstream tables.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--data-table-id` | Yes | Data table ID from `metadata data-table list`. |
| `--include-preview` | No | Include preview rows when true. |

Each call to this capability's Gateway `execute` endpoint consumes one unit of the member's natural-day quota when the user is identifiable and usage statistics are enabled. This includes metadata-only reads (`include_preview` omitted or false), previews of any table type, cache hits, repeated calls, and failures within `execute`, including schema errors or permission denials. The database engine does not affect counting. Gateway capability-discovery list/inspect and validate/dry-run endpoints do not count. `QUERY_DAILY_LIMIT_EXCEEDED` (HTTP 429) requires waiting until reset or contacting an administrator; a blocked call does not increase the used quota but remains eligible for failed-call usage auditing. `QUERY_QUOTA_UNAVAILABLE` fails explicitly. Usage persistence is asynchronous and best effort, so persisted usage-row totals need not equal quota counters. Do not change identities to bypass quota enforcement.

## Request Body

```json
{ "project_id": 1, "data_table_id": 42, "include_preview": true }
```

## Detail output

Default JSON returns the complete server payload under `data`, including columns and bindings. `--include-preview true` additionally requests preview rows; it is not required to read saved SQL configuration.

On servers that support SQL definition output, SQL tables add the following fields in both default and preview responses. Non-SQL tables omit them.

| Field | Meaning |
|---|---|
| `create_qp` | Saved creation QP as a JSON object. |
| `update_qp` | Saved update QP as a JSON object. |
| `create_zone_offset` / `update_zone_offset` | Offset in hours used to parse SQL parameters for the corresponding QP. These are not the cron schedule timezone. |
| `strategy` | Saved update strategy, such as `overwrite` or `insert`. |
| `update_cron` | Saved update cron expression. Interpret it together with `update_conf_status`. |
| `update_conf_status` | Schedule switch state: `NOT_SET`, `ENABLE`, or `DISABLE`. This is not task running status or evidence that an execution succeeded. |

The wrapper fields use snake_case. QP objects retain the published model keys: SQL is at `taSqlVo.sql`, SQL parameters at `taSqlVo.sqlVoParams`, and view parameters at `taSqlView.sqlViewParams`. Preserve all nested keys and values, including extensions, when reading or reusing the definition. See [the SQL-write QP contract](metadata_data_table_sql_write.md#qp-contract-sqldatatabledef) before constructing a write.

Parameter definitions and saved values describe configuration. Values containing expressions or placeholders may resolve differently during each execution. This response does not supply the actual resolved values of a specific execution; obtain execution evidence separately when those values are required.

For SQL tables, unavailable configuration values are `null`; missing, invalid, or non-object historical QP values also produce `null` QP fields. Default get returns `null` configuration fields when the SQL definition record is missing. `--include-preview true` retains the server's existing preview behavior; missing definition records may still cause preview to fail on affected servers. A `null` QP does not establish that the SQL has no parameters. An empty parameter array is an explicit empty saved parameter list. Older servers may omit the new fields entirely, so missing fields alone do not prove that configuration is empty or that this server supports definition output. Inspect the selected server capability when availability matters.

## Read the complete definition

Use `--format json` to retain SQL configuration beside columns and bindings. Table format may render only the columns array. CLI `--jq` runs on the payload before envelope wrapping, so paths start at `.create_qp` or `.update_qp`, not `.data`.

```bash
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id> --format json
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id> --jq '{create_qp, update_qp, create_zone_offset, update_zone_offset, strategy, update_cron, update_conf_status}'
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id> --jq '.update_qp.taSqlVo.sqlVoParams'
```

Choose the full response or a projection containing all required fields in one read. If the response is saved to a local file, inspect that file for additional paths instead of repeating the server request.
