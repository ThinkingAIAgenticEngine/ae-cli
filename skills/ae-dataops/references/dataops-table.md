---
name: dataops-table
version: 1.2.0
description: "Data table and view management: search and create tables/views, mutate one table field, recycle an entity, list the recycle bin, and permanently delete a recycled entity. Trigger keywords: table, view, column, recycle bin, permanent deletion, data dictionary, DDL."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Data Table and View Management

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for general rules.

Use `dataops_datatable` for all commands in this reference, including table/view recycling and permanent deletion.

**Core Rules:**
- Creating/modifying/deleting workspace task tables **must use the commands in this reference**, never `dataops_ide`
- Use `+dict_search_tables` as the default discovery command for the visible DataOps catalog
- Use `dataops_ide +search_tables` only when raw engine-side metadata is needed
- Use `dataops_ide +ide_list_tables` only after catalog/schema are known and you need schema browsing
- Confirm no table with the same name exists before creation
- When creating views or data tables, generate DDL according to **Trino DDL specifications**
- `+create_table` and `+create_view` create objects in the DEV environment only. Publish PROD separately with `+publish_entity`.
- Field mutation commands resolve one TASK_ENV Hive physical table by `spaceCode + tableName` and change DEV only. Publish PROD separately.
- Never add, modify, or delete a partition field. Field rename and batch mutation are not supported.
- Recycling and permanent deletion affect the exact entity's existing DEV and PRODUCT mappings immediately; they are not DEV-only edits awaiting publication.

---

## Workflow A: Search and View Table Information

```bash
# Default table discovery: search the DataOps table catalog. Prefer precise keywords; avoid broad scans.
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "user" --maxResults 20

# Get compact detail. TASK_ENV without --env returns DEV and PRODUCT.
ae-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" --tableName "dwd_user_info"
```

---

## Workflow B: Create Physical Table

```bash
# Step 1: Confirm no table with same name exists
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "dwd_user_info"

# Step 2: Create physical table in DEV (DDL must follow Trino specifications)
ae-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')"

# Step 3: Publish explicitly. name is enough when it resolves to one TASK_ENV entity.
ae-cli dataops_datatable +publish_entity --spaceCode "${spaceCode}" \
  --name "dwd_user_info"
```

---

## Workflow C: Create View

```bash
# Step 1: Confirm no view with same name exists
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "v_user_info"

# Step 2: Create DataOps view in DEV. This example expands ${spaceCode} but keeps ${env} literal.
ae-cli dataops_datatable +create_view --spaceCode "${spaceCode}" \
  --ddl "CREATE VIEW v_user_info AS SELECT user_id, user_name FROM hive.ws_${spaceCode}_\${env}.dwd_user_info"

# Step 3: Publish explicitly. name is enough when it resolves to one TASK_ENV entity.
ae-cli dataops_datatable +publish_entity --spaceCode "${spaceCode}" \
  --name "v_user_info"
```

---

## Workflow D: Add, Modify, or Delete One Field

Read the current DEV table first. Call the command once per field and wait for each actual result before changing the next field.

```bash
ae-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" \
  --tableName "orders" --manageMode TASK_ENV --env DEV --entityType TABLE

# Add one nullable ordinary field at the end. --dry-run performs a server semantic preview.
ae-cli dataops_datatable +add_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --fieldType "decimal(18,2)" \
  --comment "Order amount" --dry-run
ae-cli dataops_datatable +add_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --fieldType "decimal(18,2)" \
  --comment "Order amount"

# Change type and comment together. Omit an option to preserve that attribute.
ae-cli dataops_datatable +modify_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --fieldType "double" \
  --comment "Order amount in settlement currency" --dry-run
ae-cli dataops_datatable +modify_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --fieldType "double" \
  --comment "Order amount in settlement currency"

# Clear only the physical field comment.
ae-cli dataops_datatable +modify_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --clearComment

# Preview deletion without confirmation. Execute with --yes only after explicit user confirmation.
ae-cli dataops_datatable +delete_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --dry-run
ae-cli dataops_datatable +delete_table_field --spaceCode "${spaceCode}" \
  --tableName "orders" --fieldName "amount" --yes
```

The semantic preview returns `executable`, `wouldChange`, `plannedDiff`, blockers, and warnings without writing. Execution returns the actual post-readback `outcome`: `CHANGED`, `UNCHANGED`, `PARTIAL`, or `FAILED`. `UNCHANGED` includes a reason. `PARTIAL` and `FAILED` are command failures and exit non-zero.

Partition field mutations are always blocked. Standard TASK_ENV Hive external tables are supported, but `EXTERNAL_FILE_SCHEMA_NOT_VERIFIED` means the external file schema was not validated or rewritten. A type change also reports `DATA_COMPATIBILITY_NOT_VERIFIED`.

---

## Entity Lifecycle: Scope and Safety

These commands accept one TASK_ENV entity in the current space's built-in `te_etl` / `hive` warehouse: an ordinary physical table (including external tables) or an ordinary view. View SQL modification, restore, batch deletion, clearing the whole recycle bin, and cascading dependency deletion are not supported.

Both writes require `--spaceCode`, `--entityId`, and `--name`. The server verifies that the ID and name identify the same current-space entity; a missing ID never falls back to a new same-name object. `--dry-run` sends `preview: true` for validation without deletion, and does not require `--yes`.

`RECYCLE_NAME_CONFLICT` means an old same-name entity already exists in the recycle bin. Inspect the recycle bin and obtain separate explicit authorization before deleting that old entity. Recycling never deletes it automatically. Do not change IDs or retry by name to bypass a conflict.

The recycle-bin list keeps different entity IDs separate even when their names match. Each entry includes `entityId`, `name`, `entityType`, `environments`, and `recycleTime`; totals include `totalCount`, `returnedCount`, and `hasMore`. The server defaults to 100 results, maximum 1000. Refine `--search` if truncated.

An already recycled entity returns `UNCHANGED` with a reason. Permanent deletion accepts only recycled entities, not active or mixed-state entities. Writes return `PREVIEW`, `CHANGED`, `UNCHANGED`, `FAILED`, or `PARTIAL`; actual state changes appear in `diff`. `FAILED` and `PARTIAL` exit non-zero. Re-read the same entity ID after a failure; deletion across storage and metadata is not atomic. Existing physical-table locking is reused, but this does not add a shared lock across all view operations.

Permissions: recycle requires `dwDataTableEdit`, list requires `dwDataTableView`, and permanent deletion requires `dwDeleteTable`. External file deletion remains governed by existing engine behavior; the CLI adds no external-file cleanup action.

### Workflow E: Recycle a Table or View

An ordinary "delete table/view" request follows this workflow only. It does not authorize permanent deletion.

Find the active entity with `+dict_search_tables` and inspect `+get_table_detail`. Verify TASK_ENV scope and the existing DEV/PRODUCT mappings. Copy its exact `entityId` and name; never derive an ID from a name. Then preview:

```bash
ae-cli dataops_datatable +entity_recycle --spaceCode "${spaceCode}" \
  --entityId "${entityId}" --name "${name}" --dry-run
```

Explain the planned changes and that execution immediately affects existing DEV and PRODUCT mappings. Only after explicit user confirmation, execute:

```bash
ae-cli dataops_datatable +entity_recycle --spaceCode "${spaceCode}" \
  --entityId "${entityId}" --name "${name}" --yes
```

Inspect the actual outcome and confirm the exact recycled entity in `+recycle_bin_list`. Report `UNCHANGED` as already recycled, not as a new change. Do not infer completion from a preview, HTTP success, or a name match alone. On `FAILED`, `PARTIAL`, or unverified state, report the observed result, reconcile the same entity ID, and stop without offering permanent deletion.

After actual recycling is confirmed, the Agent may ask:

> The entity is in the recycle bin. Would you like to permanently delete it? This is irreversible and may delete internal table data.

This question belongs in the Agent's reply, not CLI output. Stop here unless the user gives a new explicit confirmation; a successful recycle is not permission to run the next workflow.

### Workflow F: Permanently Delete a Recycled Table or View

Use this workflow only for an explicit permanent-deletion request or a new affirmative answer to the post-recycle question. Never append it automatically to ordinary deletion.

Recycled objects are absent from the active table catalog. List the recycle bin, then copy and verify the exact `entityId`, name, entity type, and affected environments. If the object is active or mixed-state, stop; do not silently recycle it or choose a same-name recycled object.

```bash
ae-cli dataops_datatable +recycle_bin_list --spaceCode "${spaceCode}" \
  --search "${name}" --maxResults 100
```

Preview only the verified recycled object:

```bash
ae-cli dataops_datatable +recycle_bin_delete --spaceCode "${spaceCode}" \
  --entityId "${recycledEntityId}" --name "${name}" --dry-run
```

Explain the irreversible effect, including possible internal table data deletion, and obtain explicit confirmation for this exact target and environment scope before execution. Recycling authorization does not authorize permanent deletion.

```bash
ae-cli dataops_datatable +recycle_bin_delete --spaceCode "${spaceCode}" \
  --entityId "${recycledEntityId}" --name "${name}" --yes
```

Inspect the actual outcome and `diff`, then read the recycle bin again for the same ID. A truncated list or a missing name alone is not proof of deletion. On failure or partial completion, report the observed state and reconcile the same ID before any retry; do not switch to a newly created same-name entity.

---

## Command Quick Reference

| Command | Purpose | Risk | Key Flags |
|---------|---------|------|-----------|
| `ae-cli dataops_datatable +dict_search_tables` | DataOps table catalog search, default 50 results | read | `--spaceCode` `--search` `--maxResults` |
| `ae-cli dataops_datatable +get_table_detail` | DataOps catalog detail | read | `--spaceCode` `--tableName` `--manageMode` `--env` `--entityType TABLE\|VIEW` |
| `ae-cli dataops_datatable +create_table` | Create DataOps physical table in DEV | write | `--spaceCode` `--ddl` |
| `ae-cli dataops_datatable +create_view` | Create DataOps view in DEV | write | `--spaceCode` `--ddl` |
| `ae-cli dataops_datatable +publish_entity` | Publish table/view from DEV to PROD | write | `--spaceCode` `--name` `[--entityId]` `[--entityType]` |
| `ae-cli dataops_datatable +add_table_field` | Append one ordinary field in DEV | write | `--spaceCode` `--tableName` `--fieldName` `--fieldType` `[--comment]` |
| `ae-cli dataops_datatable +modify_table_field` | Change one ordinary field type and/or comment in DEV | write | `--spaceCode` `--tableName` `--fieldName` `[--fieldType]` `[--comment\|--clearComment]` |
| `ae-cli dataops_datatable +delete_table_field` | Delete one ordinary field in DEV | high-risk-write | `--spaceCode` `--tableName` `--fieldName`; `--yes` after confirmation |
| `ae-cli dataops_datatable +entity_recycle` | Move one table/view and its DEV/PRODUCT mappings to the recycle bin | high-risk-write | `--spaceCode` `--entityId` `--name`; `--yes` after confirmation |
| `ae-cli dataops_datatable +recycle_bin_list` | Find recycled entities by ID, including same-name objects | read | `--spaceCode` `[--search]` `[--maxResults]` |
| `ae-cli dataops_datatable +recycle_bin_delete` | Permanently delete one recycled entity | high-risk-write | `--spaceCode` `--entityId` `--name`; `--yes` after confirmation |

## Parameter Notes

- **dict_search_tables**: Searches task, IDE, system, and authorized-space tables visible to `spaceCode`. Prefer precise `--search`; default `maxResults` is 50 and max is 200. Returns `tables`, `totalCount`, `returnedCount`, `hasMore`, and `hint` when truncated. `comment` and `remark` are returned only when present.
- **get_table_detail**: Prefer exact `--tableName`. Add `--manageMode` or `--entityType TABLE|VIEW` when ambiguous. TASK_ENV without `--env` returns `environments.DEV/PRODUCT`; otherwise returns `detail`. Empty optional fields are omitted.
- **create_table**: Requires `--spaceCode` and `--ddl`; no optional flags. Creates a DataOps physical table in DEV only. The backend parses Trino-compatible DDL and saves TASK_ENV metadata in the default workspace warehouse (`repo=te_etl`, `catalog=hive`). Publish by name with `+publish_entity --name <tableName>`.
- **create_view**: Requires `--spaceCode` and `--ddl`; no optional command flags. Creates a DataOps view in DEV only. The backend saves TASK_ENV metadata through the DataView save flow in the default workspace warehouse (`repo=te_etl`, `catalog=hive`). Publish by name with `+publish_entity --name <viewName>`. Keep the literal `${env}` placeholder when referencing current-space task tables, for example `ws_${spaceCode}_${env}`.
- **publish_entity**: Requires `--spaceCode` and `--name`. Publishes one existing TASK_ENV table/view from DEV to PROD. Optional `--entityId` disambiguates same-name matches; optional `--entityType TABLE|VIEW` validates the resolved type. Returns `action/result/status`; result includes published ids/names and `ONLINE` status, or `errorType`/`candidates`/`errors`.
- **add_table_field**: Requires an exact table and field name plus one complete Trino-compatible `--fieldType`. Optional `--comment` sets the physical column comment. An identical existing definition returns `UNCHANGED`; a conflicting existing field returns `FIELD_ALREADY_EXISTS`.
- **modify_table_field**: Requires at least one of `--fieldType`, `--comment`, or `--clearComment`. `--comment` and `--clearComment` are mutually exclusive. A missing field returns `FIELD_NOT_FOUND`; the command never adds or upserts it.
- **delete_table_field**: High-risk write. Run the semantic preview first, obtain explicit user confirmation, and only then use `--yes`. A missing field returns `FIELD_NOT_FOUND`.
- **field mutation result**: Only the target field and attributes that actually changed appear in `diff`. None of the three field mutation commands accepts `entityId`, `expectedVersion`, environment, rename, position, default value, `NOT NULL`, or a field array.
- **schema naming**: DEV environment uses `ws_${spaceCode}_dev`, PROD environment uses `ws_${spaceCode}_product`. Do not hardcode either schema in current-space view DDL; use `ws_${spaceCode}_${env}` with literal `${env}`.
- **Table name rule**: `^[a-z][0-9a-z_]{0,127}$`

## Transitional Status

- Transition status: transitional
- Owning module: gaia-mcp-datatable
- Current transport: Gaia CLI REST
- Gateway target: TBD
- Review after: 2026-12-04
- Exit condition: Equivalent Gateway capabilities preserve semantic preview, single-field input, exact entity-ID lifecycle operations, recycle-bin discovery, deletion confirmation, and structured actual outcomes.
