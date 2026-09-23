---
name: ae-metadata
version: 1.0.2
description: "AE metadata capability-gateway CLI: list, inspect, create, update, delete and download metadata data tables; bind an existing dimension table to a property or create and bind a CSV dimension table. Local file upload and event/property discovery are separate prerequisite capabilities."
---

# ae-metadata

CLI domain **`metadata`** routes to the analysis capability gateway (`/api/cli/analysis/v1/...`), using auth header **`cli-token`**.

Use this skill for gateway-backed data-table and property dimension-table operations.

## Capability contract

- Responsibilities: data-table management and dimension-table bindings through the commands below.
- Inputs: verified project, table/property identifiers and operation-specific parameters; local CSV workflows need a valid uploaded input-file identifier and purpose.
- Outputs: table/binding operation results, resource identifiers, or download run/artifact status. A submitted asynchronous download is not yet a completed file.
- Boundaries: local input-file upload, event/property detail and discovery, metric CRUD, virtual metadata, batch metadata, project configuration and tracking plans are separate capabilities.
- Completion: the requested table or binding result is verified, or pending/blocked work and its remaining requirements are reported.

## Cross-skill collaboration

When remaining work is outside this skill's scope, or a necessary prerequisite needs another capability, follow [the collaboration protocol](references/collaboration.md). Choose from the skills available in this run by capability, preserve verified context, and continue the remaining task. Reuse this protocol if already loaded.

## Global AE CLI Rules

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default JSON. |
| `--jq <expr>` | jq filter on JSON output. |
| `--host <url>` | Override active AE host, e.g. `ae-cli metadata data-table list --host <url> ...`. |
| `--validate` | Optional: fix params only (`/validate`). Alone while iterating complex `qp` / payload — then run. Do not stack with `--dry-run`. |
| `--dry-run` | Optional: confirm ready to run (`/dry-run`). Alone for risk/output preview. Do not stack with `--validate`. |

Output and errors:
- Success: JSON envelope (default). May include optional `_notice.host_compat`.
- Failure: `{ "ok": false, "error": { "type", "message", "hint" } }`, non-zero exit.
- **CRITICAL — Host compat (do this first):** After each `ae-cli` run, check stderr and `_notice.host_compat`. If either is present, open the user reply with a short ⚠️ version warning and **quote the `npm i -g` / `npx skills add` (or update-cluster) lines verbatim**, then present the business result. Soft tip; `ok: true` can still carry the notice.

Safety:
- Read-only commands can run directly after IDs/names are verified.
- Ordinary writes (`data-table *-write`, `property-bindings-update`, dimension-table bind/create) execute without `--yes`. Delete commands are `high-risk-write`: dry-run first, summarize impact, wait for explicit confirmation, then execute with `--yes`.
- **Before any command**, read the matching `references/<name>.md` (filename = command with spaces → underscores, e.g. `metadata data-table list` → `metadata_data_table_list.md`).
- Never invent `project_id`, event/property names, `input_file_id`, or `data_table_id`. Reuse verified names or discover a metadata lookup capability; find data table IDs via `metadata data-table list`.
- `metadata data-table download` is an async artifact command: plain invocation submits, `--wait` waits, and `--output <file>` waits then streams atomically. Resume with `analysis run wait`; local interruption never cancels the remote run.

## When to Use

Use this skill when the user needs:

- Metadata data-table list/get/create/update/delete/download
- For local uploads, first obtain an input-file identifier through an available upload capability with the required purpose, then continue the table operation.
- Bind an existing data table to a property, or create a CSV dimension table and bind it

For out-of-scope work, discover an available capability using the collaboration protocol.

## Command Format

```bash
ae-cli metadata <resource> <action> [options]
ae-cli metadata property <dimension-table-action> [options]
```

- Commands and flags use **kebab-case**: `data-table`, `dimension-table`, `--project-id`, `--data-table-id`.
- Gateway `input` body fields remain **snake_case** (`project_id`, `event_name`, …); ae-cli maps flags automatically.

## PROJECT_ID_GATE

Reuse verified project context in one conversation; otherwise discover a project lookup capability to resolve `project_id`. Ask the user only when the returned projects leave a real ambiguity.

## Commands (10)

| User command | Capability id | Reference |
|---|---|---|
| `metadata data-table list` | `metadata.data_table.list` | [metadata_data_table_list.md](references/metadata_data_table_list.md) |
| `metadata data-table get` | `metadata.data_table.get` | [metadata_data_table_get.md](references/metadata_data_table_get.md) |
| `metadata data-table csv-write` | `metadata.data_table.csv_write` | [metadata_data_table_csv_write.md](references/metadata_data_table_csv_write.md) |
| `metadata data-table sql-write` | `metadata.data_table.sql_write` | [metadata_data_table_sql_write.md](references/metadata_data_table_sql_write.md) |
| `metadata data-table csv-delete` | `metadata.data_table.csv_delete` | [metadata_data_table_csv_delete.md](references/metadata_data_table_csv_delete.md) |
| `metadata data-table sql-delete` | `metadata.data_table.sql_delete` | [metadata_data_table_sql_delete.md](references/metadata_data_table_sql_delete.md) |
| `metadata data-table download` | `metadata.data_table.download` | [metadata_data_table_download.md](references/metadata_data_table_download.md) |
| `metadata data-table property-bindings-update` | `metadata.data_table.property_bindings_update` | [metadata_data_table_property_bindings_update.md](references/metadata_data_table_property_bindings_update.md) |
| `metadata property bind-existing-dimension-table` | `metadata.property.bind_existing_dimension_table` | [metadata_property_dimension_table_bind_existing.md](references/metadata_property_dimension_table_bind_existing.md) |
| `metadata property create-and-bind-csv-dimension-table` | `metadata.property.create_and_bind_csv_dimension_table` | [metadata_property_dimension_table_create_and_bind_csv.md](references/metadata_property_dimension_table_create_and_bind_csv.md) |

## Quick Verification

```bash
ae-cli metadata --help
ae-cli metadata data-table list --help
ae-cli metadata data-table list --project-id 1 --dry-run
ae-cli analysis input-file purpose list --project-id 1
```
