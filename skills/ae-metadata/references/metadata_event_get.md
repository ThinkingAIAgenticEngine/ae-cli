# metadata event get (Super-Event Detail)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md) (`ae-metadata` skill).
>
> Capability id: `metadata.event.get` · Domain: `metadata` (capability gateway REST, not MCP `analysis_meta`).

## Use Cases

- Fetch **one** super-event metadata record by technical name (full detail, not a paginated list).
- Inspect virtual event definition (`definition.sources`, filters, relation) when `event_kind=virtual_event`.
- Read-only; requires metadata **view** permission (`VIEW_META`) in the target project.

## Commands

```bash
ae-cli metadata event get --project-id <project_id> --event-name <event_name>
ae-cli metadata event get -p <project_id> --event-name <event_name> --dry-run
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--event-name` | Yes | Super-event technical name. Virtual events use the same field. |

Gateway request body uses snake_case `input`:

```json
{
  "project_id": 1,
  "event_name": "purchase"
}
```

## Decision Rules

- Prefer **`metadata event get`** over `analysis_meta +list_events` when you need **full detail + virtual definition**, not browsing or fuzzy search.
- Use `ae-analysis` → `analysis_meta +list_events` first when the event name is unknown or you need keyword search / pagination.
- If the gateway returns `EVENT_NOT_FOUND`, verify `event_name` spelling and `project_id`; do not invent names.
- Auth: `cli-token` header (ae-cli injects automatically in sandbox; local CLI uses `getCliToken()`).

## Recommended Chaining

- `ae-analysis`: `analysis_meta +list_events` (discover name) → `metadata event get` (detail)
- `metadata event get` → `metadata property get` (inspect properties listed in response)

## Next Steps After Failure

- Empty or not found: confirm project id and exact `event_name` from `+list_events`.
- Permission error: confirm metadata view permission in the project.
- Gateway unavailable: confirm nginx routes `/api/cli/metadata/` and backend capability catalog is deployed.
