# analysis_audience +get_cluster_definition_schema (Get Cluster Definition Schema)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Schema Query**

## Use Cases
- Support tool positioning: the current command provides the structure definition (schema) and should be used as a prerequisite step.
- Recommended sequence: first call this schema tool to get the structure, then verify metadata in the same session and `project_id` (first build/update calls `analysis_meta +list_events` / `analysis_meta +list_properties`; later calls should reuse session-verified results first), and finally create or update clusters.
- Get the cluster definition schema. Supports cluster type + response mode + condition subtype.

## Commands
```bash
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type sql
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition --response_mode base
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition --response_mode examples --condition_subtype behavior_seq
ae-cli analysis_audience +get_cluster_definition_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--cluster_type` | Yes | Cluster type. Supported values: condition and sql |
| `--response_mode` | No | Schema response mode. Supported values: `base`, `examples`, `full`. Default: `base`. |
| `--condition_subtype` | No | Only effective when `--cluster_type condition`. Supported values: `core`, `behavior_seq`, `all`. Default: `core`. |

## Progressive Loading Strategy
- Use the smallest response that can solve the current task. Large schemas consume context and can make the follow-up definition construction less reliable.
- Start with `--response_mode base` or omit `--response_mode` for simple condition clusters and SQL clusters.
- Request `--response_mode examples` only when the base schema is not enough to build or validate the target `definition`.
- Request `--response_mode full` only for complex, ambiguous, or repeatedly failing definition construction. Do not use `full` by default.
- For normal condition clusters, use the default `--condition_subtype core`.
- Use `--condition_subtype behavior_seq` only when the user specifically needs behavior sequence conditions.
- Use `--condition_subtype all` only when comparing condition subtypes or when the exact subtype cannot be determined after reading the user request. Avoid `all` for simple creation/update tasks.
- For clear SQL cluster requests, call `--cluster_type sql` with base mode first.

## Decision Rules
- `--cluster_type` must be explicitly set to `condition` or `sql`.
- Prefer `--response_mode base` first; request `examples` only when needed; request `full` only as a last resort.
- `--condition_subtype` should only be passed for `condition` schemas.
- It is recommended to run `--dry-run` first to inspect the request mapping before making the actual call.
- The current command returns only structure constraints; it does not guarantee that the field values are available in the target project. Event names and property names must be confirmed again with `analysis_meta` metadata interfaces.
- Before calling `analysis_meta +list_events` / `analysis_meta +list_properties`, first read their reference docs to confirm the parameter and return-field meanings. Query metadata on the first build/update in this session for the same `project_id`; after that, prefer reusing session-verified metadata.

## Next Step on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was used (filter/groupby/query/tag/cluster).

## Recommended Chain
- First read: [`./get_cluster_definition_schema.md`](./get_cluster_definition_schema.md) -> [`./list_events.md`](./list_events.md) -> [`./list_properties.md`](./list_properties.md)
- +get_cluster_definition_schema -> (first build/update in session or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +create_cluster
- +get_cluster_definition_schema -> (first build/update in session or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +update_cluster
