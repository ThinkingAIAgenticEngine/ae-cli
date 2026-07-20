# analysis-meta property list

Use when the user needs to browse or search event/user property metadata.

Do not use it for property values. Use this command only when the user explicitly wants to inspect metadata or when a prior compiler error asks for disambiguation.

Command:

```bash
ae-cli analysis-meta property list --project-id <project_id>
ae-cli analysis-meta property list --project-id <project_id> --scope event --event-name purchase --query demo
ae-cli analysis-meta property list --project-id <project_id> --query demo --fields '["prop_id","prop_name","prop_desc","prop_remark","select_type","table_type","authentication_status"]' --limit 20 --offset 0
ae-cli analysis-meta property list --dry-run
```

Capability id: `metadata.property.list`.

Input sends `project_id` and optional `table_type`, `scope`, `event_name`, `query`, `fields`, `limit`, `offset`, `authenticated_only`.

Output `data.properties[]` contains property metadata. When `limit` or `offset` is provided, output also includes `total`, `limit`, `offset`, and `has_more`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | No | Optional property table type: `event` or `user`. |
| `--scope` | No | Optional property scope: `event` or `user`. If omitted, all scopes are queried. |
| `--event-name` | No | Optional event name filter for event properties. |
| `--query` | No | Optional keyword filter. Fuzzy match is applied to property name, description, and remark. |
| `--fields` | No | Optional fields to return as a JSON array. Supported fields: `prop_id`, `prop_name`, `prop_desc`, `prop_remark`, `select_type`, `table_type`, `sub_table_type`, `authentication_status`. |
| `--limit` | No | Optional page size. |
| `--offset` | No | Optional zero-based page offset. |
| `--authenticated-only` | No | When true, return only authenticated properties. |

## Decision Rules

- Prefer `--scope event` or `--scope user` when the user needs a specific table type.
- Use `--authenticated-only true` only when the user explicitly asks for authenticated assets.
- For ad-hoc analysis, pass the user's property wording in the AI-facing `definition` instead of pre-querying property metadata.
