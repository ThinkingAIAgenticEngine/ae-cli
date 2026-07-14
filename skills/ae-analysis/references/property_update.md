# analysis-meta property update

Use when the user needs to update property display names and remarks.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta property update --project-id <project_id> --table-type <table_type> --prop-name <prop_name> --prop-desc <prop_desc> --prop-remark <prop_remark>
ae-cli analysis-meta property update --dry-run
```

Capability id: `metadata.property.update`.

Input sends `project_id`, `table_type`, `prop_name`, `prop_desc`, `prop_remark`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--prop-name` | Yes | Property column name. |
| `--prop-desc` | No | Property display name. |
| `--prop-remark` | No | Property remark. |
