# analysis_audience +build_cluster_definition (Build Cluster Definition)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases

- Build a cluster definition JSON from structured intent. Call this before `+create_cluster` or `+update_cluster` to generate the `definition` field.
- For type=condition, event and property names are resolved from project metadata — do not guess.
- For type=sql, pass the SQL string directly.
- On success, pass the returned definition to `+create_cluster` or `+update_cluster`.

## Required Prerequisites (MUST)

- Before calling this command, you must first read and follow these reference docs:
  - [`./get_cluster_definition_schema.md`](./get_cluster_definition_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not construct `--conditions` / `--include_filter` / `--exclude_filter` until the schema has been read and metadata has been verified for the same `project_id`.

## Commands

```bash
ae-cli analysis_audience +build_cluster_definition --project_id <project_id> --type condition --conditions '{}'
ae-cli analysis_audience +build_cluster_definition --project_id <project_id> --type condition --conditions '{}' --include_filter '{}' --exclude_filter '{}'
ae-cli analysis_audience +build_cluster_definition --project_id <project_id> --type sql --sql 'SELECT "#user_id" FROM ...'
ae-cli analysis_audience +build_cluster_definition --dry-run
```

## Parameters

| Parameter             | Required | Description                                                                                                                           |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `--project_id` / `-p` | Yes      | Project ID                                                                                                                            |
| `--type`              | Yes      | Cluster type. Supported values: `condition`, `sql`                                                                                    |
| `--conditions`        | No       | For type=condition: main condition group JSON (required when type=condition). See `+get_cluster_definition_schema` for the structure. |
| `--include_filter`    | No       | For type=condition: global include condition group JSON.                                                                              |
| `--exclude_filter`    | No       | For type=condition: global exclude condition group JSON.                                                                              |
| `--sql`               | No       | For type=sql: SQL query returning a single column named `#user_id`.                                                                   |

## Decision Rules

- Determine `--type` first, then pass the corresponding parameters.
- For type=condition, `--conditions` is effectively required; `--include_filter` and `--exclude_filter` are optional global filters.
- For type=sql, only `--sql` is needed; condition-related parameters are ignored.
- Event and property names in condition JSON must come from session-verified metadata (`analysis_meta +list_events` / `+list_properties` for the same `project_id`).
- Do not guess event or property names — always verify against real metadata first.
- Wrap JSON parameters in single quotes (e.g. `--conditions '{}'`) to avoid shell escaping issues.
- Run `--dry-run` first to inspect the request mapping before making the actual call.

## Next Step on Failure

- If required parameters are missing, check that `--project_id` and `--type` are provided.
- If the returned definition is rejected by `+create_cluster` or `+update_cluster`, re-read `+get_cluster_definition_schema` with `--response_mode examples` and verify metadata names again.

## Recommended Chain

- `+get_cluster_definition_schema` → (first build/update in session or refresh) `analysis_meta +list_events` → `analysis_meta +list_properties` → `+build_cluster_definition` → `+create_cluster`
- `+get_cluster_definition_schema` → (first build/update in session or refresh) `analysis_meta +list_events` → `analysis_meta +list_properties` → `+build_cluster_definition` → `+update_cluster`
