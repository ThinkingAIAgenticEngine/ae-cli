# analysis-meta property list

Use when the user needs to browse or search event/user property metadata, including dimension-table and complex child properties.

Do not use it for property values. Use it when the task needs property metadata that is not already available from a verified definition or prior response.

Command:

```bash
ae-cli analysis-meta property list --project-id <project_id>
ae-cli analysis-meta property list --project-id <project_id> --scope event --event-name purchase --queries '["demo","sample"]'
ae-cli analysis-meta property list --project-id <project_id> --queries '["demo","sample"]' --fields '["prop_id","prop_name","prop_desc","prop_remark","select_type","table_type","authentication_status"]' --limit 50 --offset 0
```

Capability id: `metadata.property.list`.

Input sends `project_id` and optional `table_type`, `scope`, `event_name`, `queries`, `fields`, `limit`, `offset`, and `authenticated_only`.

Output always uses the directory envelope: `data.properties[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`. Dimension-table and complex child properties are returned as independent flat rows, so keyword search, field projection, and pagination apply to them in the same way as top-level properties.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | No | Optional property table type: `event` or `user`. |
| `--scope` | No | Optional property scope: `event` or `user`. If omitted, all scopes are queried. |
| `--event-name` | No | Optional event name filter for event properties. |
| `--queries` | No | JSON array of 1-20 keyword filters. A row is returned when any keyword matches property name, description, or remark. |
| `--fields` | No | Optional fields to return as a JSON array. Supported fields: `prop_id`, `prop_name`, `prop_desc`, `prop_remark`, `select_type`, `table_type`, `sub_table_type`, `authentication_status`. |
| `--limit` | No | Page size. Default: 50, maximum: 200; values outside 1..200 are rejected. |
| `--offset` | No | Zero-based page offset. Default: 0; negative values are rejected. |
| `--authenticated-only` | No | When true, return only authenticated properties. |

## Decision Rules

- Prefer `--scope event` or `--scope user` when the user needs a specific table type.
- Use `--authenticated-only true` only when the user explicitly asks for authenticated assets.
- For a missing event property, use `--scope event --event-name <verified_event_name>`; reuse properties already known from selected definitions.
- For a complete result, use `analysis-meta property export`; do not page repeatedly to synthesize an export.
