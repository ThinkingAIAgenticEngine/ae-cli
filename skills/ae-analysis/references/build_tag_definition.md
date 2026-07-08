# analysis_audience +build_tag_definition (Build Tag Definition)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases

- Build a tag definition JSON from structured intent. Call this before `+create_tag` or `+update_tag` to generate the `definition` field.
- Supported types: `condition` (multi-value), `metric` (event metric), `first_last` (first/last occurrence), `sql`.
- For condition/metric/first_last types, event and property names are resolved from project metadata — do not guess.
- On success, pass the returned definition to `+create_tag` or `+update_tag`.

## Required Prerequisites (MUST)

- Before calling this command, you must first read and follow these reference docs:
  - [`./get_tag_definition_schema.md`](./get_tag_definition_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not construct `--condition_values` / `--metric` / `--first_last` until the schema has been read and metadata has been verified for the same `project_id`.

## Commands

```bash
ae-cli analysis_audience +build_tag_definition --project_id <project_id> --type condition --condition_values '[]'
ae-cli analysis_audience +build_tag_definition --project_id <project_id> --type metric --metric '{}'
ae-cli analysis_audience +build_tag_definition --project_id <project_id> --type first_last --first_last '{}'
ae-cli analysis_audience +build_tag_definition --project_id <project_id> --type sql --sql 'SELECT "#user_id", tag_value FROM ...'
ae-cli analysis_audience +build_tag_definition --dry-run
```

## Parameters

| Parameter             | Required | Description                                                                                                                                                                       |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--project_id` / `-p` | Yes      | Project ID                                                                                                                                                                        |
| `--authenticated_only` | No | Resolve only authenticated assets while building the definition. |
| `--type`              | Yes      | Tag type. Supported values: `condition`, `metric`, `first_last`, `sql`                                                                                                            |
| `--condition_values`  | No       | For type=condition: list of tag value definitions JSON array. Each item defines a segment label and its conditions. See `+get_tag_definition_schema` for the structure.            |
| `--metric`            | No       | For type=metric: metric definition JSON. Fields: `eventName`, `analysis`, `quota` (property name), `recentDay`/`startTime`/`endTime`.                                             |
| `--first_last`        | No       | For type=first_last: first/last occurrence definition JSON. Fields: `eventName`, `firstEvent` (true=first, false=last), `calcPropType`, `property`, `recentDay`/`startTime`/`endTime`. |
| `--sql`               | No       | For type=sql: SQL query returning two columns: `#user_id` and the tag value.                                                                                                      |

## Decision Rules
- Use `--authenticated_only true` when the definition should only resolve authenticated events/properties/metrics/clusters/tags.

- Determine `--type` first, then pass only the corresponding parameter.
- For type=condition, `--condition_values` is effectively required.
- For type=metric, `--metric` is effectively required.
- For type=first_last, `--first_last` is effectively required.
- For type=sql, only `--sql` is needed; other type-specific parameters are ignored.
- Event and property names must come from session-verified metadata (`analysis_meta +list_events` / `+list_properties` for the same `project_id`).
- Do not guess event or property names — always verify against real metadata first.
- Wrap JSON parameters in single quotes (e.g. `--condition_values '[]'`) to avoid shell escaping issues.
- Run `--dry-run` first to inspect the request mapping before making the actual call.

## Next Step on Failure

- If required parameters are missing, check that `--project_id` and `--type` are provided.
- If the returned definition is rejected by `+create_tag` or `+update_tag`, re-read `+get_tag_definition_schema` with `--response_mode examples` and verify metadata names again.

## Recommended Chain

- `+get_tag_definition_schema` → (first build/update in session or refresh) `analysis_meta +list_events` → `analysis_meta +list_properties` → `+build_tag_definition` → `+create_tag`
- `+get_tag_definition_schema` → (first build/update in session or refresh) `analysis_meta +list_events` → `analysis_meta +list_properties` → `+build_tag_definition` → `+update_tag`
