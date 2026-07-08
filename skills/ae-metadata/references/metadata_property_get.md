# metadata property get (Super-Property Detail)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md) (`ae-metadata` skill).
>
> Capability id: `metadata.property.get` · Domain: `metadata` (capability gateway REST, not MCP `analysis_meta`).

## Use Cases

- Fetch **one** super-property metadata record (event scope or user scope).
- Inspect virtual property definition (`definition.expression`, `dependencies`).
- Read-only; requires metadata **view** permission in the target project.

## Commands

```bash
ae-cli metadata property get --project-id <project_id> --property-name <name> --property-scope event
ae-cli metadata property get --project-id <project_id> --property-name <name> --property-scope user --dry-run
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--property-name` | Yes | Super-property technical name. |
| `--property-scope` | Yes | `event` (super event properties) or `user` (super user properties). |

Gateway request body uses snake_case `input`:

```json
{
  "project_id": 1,
  "property_name": "price",
  "property_scope": "event"
}
```

## Decision Rules

- Prefer **`metadata property get`** over `analysis_meta +list_properties` when you need **full detail + virtual definition**, not browsing or fuzzy search.
- Use `ae-analysis` → `analysis_meta +list_properties` first when the property name is unknown or you need keyword search / pagination.
- `property_scope` must be exactly `event` or `user` (backend accepts case-insensitive).
- Virtual / dict / exchange-rate properties are addressed by `property-name` only; do not pass legacy `prop_name`.
- Event-scoped names like `#account_id` must be passed literally (quote in shell when `#` is present).

## Recommended Chaining

- `ae-analysis`: `analysis_meta +list_properties` (discover name + scope) → `metadata property get` (detail)
- `metadata event get` → `metadata property get` (follow properties from event detail)

## Next Steps After Failure

- Not found: confirm scope (`event` vs `user`) and exact name from `+list_properties`.
- Permission error: confirm metadata view permission in the project.
