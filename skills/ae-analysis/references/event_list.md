# analysis-meta event list

Use when the user needs to list project super events, search event metadata, page results, project fields, or filter to authenticated events.

Do not use it for raw tracked events, event counts, or one full definition; it lists project super-event metadata.

Command:

```bash
ae-cli analysis-meta event list --project-id <project_id>
ae-cli analysis-meta event list --project-id <project_id> --query login --fields '["event_name","event_desc","authentication_status"]' --limit 20 --offset 0 --authenticated-only
ae-cli analysis-meta event list --dry-run
```

Capability id: `metadata.event.list`.

Input sends `project_id`, `query`, `fields`, `limit`, `offset`, and `authenticated_only`.

Use snake_case projection fields: `event_id`, `event_name`, `event_desc`, `remark`, `event_tag`, `authentication_status`. Do not send legacy camelCase field names.

Output `data.events[]` contains project super-event metadata records.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match is applied to `event_name`, `event_desc`, and `remark`. |
| `--fields` / `-f` | No | Optional JSON array of snake_case fields to return. |
| `--limit` / `-l` | No | Optional page size. When omitted, existing full-list behavior is preserved. Maximum: 50. |
| `--offset` / `-o` | No | Optional zero-based page offset. |
| `--authenticated-only` | No | When true, return only authenticated events and include `authentication_status` when projected. |
