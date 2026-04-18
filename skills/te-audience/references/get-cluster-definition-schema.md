# te_audience +get_cluster_definition_schema (Get Cluster Definition Schema)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Schema Query**

## Use Cases
- Support tool positioning: the current command provides the structure definition (schema) and should be used as a prerequisite step.
- Recommended sequence: first call this schema tool to get the structure, then call `te_meta +list_events` / `te_meta +list_properties` to obtain real metadata, and finally create or update clusters.
- Get the cluster definition schema. Supports the condition and sql cluster types and returns field definitions, enum descriptions, and examples.

## Commands
```bash
te-cli te_audience +get_cluster_definition_schema --cluster_type condition
te-cli te_audience +get_cluster_definition_schema --cluster_type sql
te-cli te_audience +get_cluster_definition_schema --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--cluster_type` | Yes | Cluster type. Supported values: condition and sql |

## Decision Rules
- `--cluster_type` must be explicitly set to `condition` or `sql`.
- It is recommended to run `--dry-run` first to inspect the request mapping before making the actual call.
- The current command returns only structure constraints; it does not guarantee that the field values are available in the target project. Event names and property names must be confirmed again with `te_meta` metadata interfaces.
- Before calling `te_meta +list_events` / `te_meta +list_properties`, first read their reference docs to confirm the parameter and return-field meanings.

## Next Step on Failure
- If reading fails, first verify whether the object ID exists and belongs to the current project.
- If the schema does not match expectations, confirm whether the correct schema interface was used (filter/groupby/query/tag/cluster).

## Recommended Chain
- First read: [`./get-cluster-definition-schema.md`](./get-cluster-definition-schema.md) -> [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md) -> [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- +get_cluster_definition_schema -> te_meta +list_events -> te_meta +list_properties -> +create_cluster
- +get_cluster_definition_schema -> te_meta +list_events -> te_meta +list_properties -> +update_cluster
