# analysis-meta virtual-event create

Use when the user needs to create a virtual event from events and filters.

Do not use it for super-event creation. Prefer typed `analysis_meta +create_virtual_event` unless an exact virtual-event rule DTO is already available.

Command:

```bash
ae-cli analysis-meta virtual-event create --project-id <project_id> --override false --payload '{"event_name":"qualified_purchase","event_desc":"Qualified purchase","rule":{"events":[...],"filter":{...}}}'
ae-cli analysis-meta virtual-event create --dry-run
```

Capability id: `metadata.virtual_event.create`.

Input sends `project_id`, `override`, `payload`.

Output is a successful gateway envelope with no business data. Read back with `virtual-event get` when the created event ID is known.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--override` | No | Whether to override an existing virtual event rule. |
| `--payload` | Yes | Virtual-event DTO: `event_id?`, `event_name`, `event_desc?`, `remark?`, `rule` (`events` plus optional common `filter`), `replace_remark?`, `replace_suggestion?`. Common header fields are server-owned and must be omitted. |
