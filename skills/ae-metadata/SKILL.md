---
name: ae-metadata
version: 1.0.0
description: "AE/TE metadata capability-gateway CLI: metadata event/property detail, metadata data-table management, input-file upload, and property dimension-table binding. Use for ae-cli metadata commands backed by /api/cli/metadata/v1. Must read references before composing commands; command/flags use kebab-case while gateway input keeps snake_case. Never guess project_id, event/property names, input_file_id, or data_table_id."
---

# ae-metadata

Capability-gateway domain **`metadata`** — REST via `/api/cli/metadata/v1/...`, auth header **`cli-token`**.

Parallel to **`ae-analysis`** (MCP `analysis_meta` for metadata lists/governance). Use **this skill** for gateway-backed metadata detail and data-table/dimension-table operations; use **`ae-analysis`** for MCP metadata list/search, metrics, virtual create, and batch edit.

## Global AE CLI Rules

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default JSON. |
| `--jq <expr>` | jq filter on JSON output. |
| `--host <url>` | Override active AE host, e.g. `ae-cli metadata event get --host <url> ...`. |
| `--dry-run` | Validate input against gateway schema without executing. |

Output and errors:
- Success: JSON envelope (default).
- Failure: `{ "ok": false, "error": { "type", "message", "hint" } }`, non-zero exit.

Safety:
- Read-only commands can run directly after IDs/names are verified.
- Write commands (`data-table *-write`, `*-delete`, `property-bindings-update`, dimension-table bind/create, `input-file upload`) require `--yes` for non-dry-run execution.
- **Before any command**, read the matching `references/<name>.md` (filename = command with spaces → underscores, e.g. `metadata event get` → `metadata_event_get.md`).
- Never invent `project_id`, event/property names, `input_file_id`, or `data_table_id`. Discover names via `ae-analysis` and data table IDs via `metadata data-table list`.

## When to Use

Switch to **`ae-metadata`** when the user needs:

- Full detail for **one** super-event (incl. virtual event `definition`)
- Full detail for **one** super-property (incl. virtual property `definition`)
- Metadata data-table list/get/create/update/delete/download
- Upload a local file to get `input_file_id`
- Bind an existing data table to a property, or create a CSV dimension table and bind it

Stay on **`ae-analysis`** for: metadata event/property/metric list/search, metric CRUD, batch metadata, virtual create, project config, tracking plans.

## Command Format

```bash
ae-cli metadata <resource> <action> [options]
ae-cli metadata property <dimension-table-action> [options]
```

- Commands and flags use **kebab-case**: `data-table`, `input-file`, `dimension-table`, `--project-id`, `--data-table-id`.
- Gateway `input` body fields remain **snake_case** (`project_id`, `event_name`, …); ae-cli maps flags automatically.

## PROJECT_ID_GATE

Same rules as `ae-analysis`: reuse verified project context in one conversation; otherwise `ae-cli analysis_common +list_projects` (or `ae-analysis` skill) to resolve `project_id`.

## Commands (13)

| User command | Capability id | Reference |
|---|---|---|
| `metadata event get` | `metadata.event.get` | [metadata_event_get.md](references/metadata_event_get.md) |
| `metadata property get` | `metadata.property.get` | [metadata_property_get.md](references/metadata_property_get.md) |
| `metadata input-file upload` | `POST /input-files` | [metadata_input_file_upload.md](references/metadata_input_file_upload.md) |
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
ae-cli metadata event get --help
ae-cli metadata property get --help
ae-cli metadata data-table list --help
ae-cli metadata event get --project-id 1 --event-name <name> --dry-run
ae-cli metadata data-table list --project-id 1 --dry-run
```

## Related Skills

- **`ae-analysis`**: `analysis_meta +list_events` / `+list_properties` to discover names before detail get.
- **Dev workflow**: `.cursor/skills/te-cli-capability-gateway` — inspect gateway schema when adding new metadata capabilities.
